from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import EmailStr
import secrets
from datetime import datetime, timedelta
import logging
import traceback
import smtplib
from email.message import EmailMessage

from app.database import conn
from app.auth.permissions import require_permission, current_actual_user_id
from app.schemas.team import InviteMember, ChangeRole, AcceptInvitation
from app.utils import hash
from app.services.audit import log_action
from app.email_utils.email_utils import send_email, EmailNotConfigured

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/team", tags=["Team Management"])

@router.get("/roles")
def get_roles(organization_id: int = Depends(require_permission("users.manage"))):
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, name, description FROM roles WHERE name != 'Client Portal User' ORDER BY id ASC")
        return {"data": cursor.fetchall()}

@router.get("/members")
def get_members(organization_id: int = Depends(require_permission("users.manage"))):
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT om.id, u.email, om.status, om.joined_at, r.name as role_name, r.id as role_id, om.user_id
            FROM organization_members om
            JOIN users u ON om.user_id = u.id
            JOIN roles r ON om.role_id = r.id
            WHERE om.organization_id = %s
            ORDER BY om.joined_at DESC
        """, (organization_id,))
        return {"data": cursor.fetchall()}

@router.get("/invitations")
def get_invitations(organization_id: int = Depends(require_permission("users.manage"))):
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT i.id, i.email, i.status, i.expires_at, i.created_at, r.name as role_name, r.id as role_id
            FROM invitations i
            JOIN roles r ON i.role_id = r.id
            WHERE i.organization_id = %s
            ORDER BY i.created_at DESC
        """, (organization_id,))
        return {"data": cursor.fetchall()}

@router.post("/invite")
def invite_member(payload: InviteMember, organization_id: int = Depends(require_permission("users.manage"))):
    actual_user_id = current_actual_user_id.get()
    with conn.cursor() as cursor:
        # Check if already a member
        cursor.execute("""
            SELECT 1 FROM organization_members om
            JOIN users u ON om.user_id = u.id
            WHERE om.organization_id = %s AND u.email = %s
        """, (organization_id, payload.email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="User is already a member of this organization")

        # Check for active invitation
        cursor.execute("""
            SELECT 1 FROM invitations 
            WHERE organization_id = %s AND email = %s AND status = 'pending' AND expires_at > NOW()
        """, (organization_id, payload.email))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Active invitation already exists for this email")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        cursor.execute("""
            INSERT INTO invitations (organization_id, email, role_id, token, expires_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (organization_id, payload.email, payload.role_id, token, expires_at))
        inv_id = cursor.fetchone()["id"]
        
        conn.commit()
        
        log_action(organization_id, actual_user_id, "invitation_sent", "team", inv_id, f"Invited {payload.email}", {"email": payload.email})
        
        # Dispatch email
        accept_url = f"http://localhost:5173/accept-invitation?token={token}"
        
        # DEV MODE fallback
        print(f"\n[DEV MODE] Invitation Link:\n{accept_url}\n")
        
        cursor.execute("SELECT name FROM organizations WHERE id = %s", (organization_id,))
        org_name = cursor.fetchone()["name"]
        
        cursor.execute("SELECT name FROM roles WHERE id = %s", (payload.role_id,))
        role_row = cursor.fetchone()
        if not role_row or role_row["name"] == "Client Portal User":
            raise HTTPException(status_code=400, detail="Invalid role selected")
        role_name = role_row["name"]

        subject = f"You have been invited to join {org_name} on VexBill"
        
        # Plain text fallback
        body = f"Hello,\n\nYou have been invited to join {org_name} as a {role_name}.\n\nClick the link below to accept the invitation:\n{accept_url}\n\nThis link expires on {expires_at.strftime('%B %d, %Y')}."
        
        # HTML template
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px;">You're Invited!</h1>
              <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
                You have been invited to join <strong>{org_name}</strong> as a <strong>{role_name}</strong> on VexBill.
              </p>
              <a href="{accept_url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-bottom: 24px;">Accept Invitation</a>
              <p style="color: #9ca3af; font-size: 14px;">This invitation link will expire on {expires_at.strftime('%B %d, %Y')}.</p>
            </div>
          </body>
        </html>
        """
        
        logger.info(f"Preparing to send invitation email to: {payload.email}")
        try:
            send_email(
                owner_id=organization_id,
                to_email=payload.email,
                subject=subject,
                body=body,
                html_body=html_body
            )
            logger.info("Email sent successfully")
            return {"message": "Invitation sent successfully", "token": token}
        except Exception as e:
            logger.error("Email send failure")
            logger.error(traceback.format_exc())
            # Insert audit log indicating failure
            log_action(organization_id, actual_user_id, "email_delivery_failed", "team", inv_id, f"Failed to send email to {payload.email}: {str(e)}")
            return {"message": "Invitation created, but email delivery failed. Please share the link manually.", "token": token, "email_error": str(e)}

@router.put("/member/{member_id}/role")
def change_role(member_id: int, payload: ChangeRole, organization_id: int = Depends(require_permission("users.manage"))):
    actual_user_id = current_actual_user_id.get()
    with conn.cursor() as cursor:
        cursor.execute("SELECT role_id, user_id FROM organization_members WHERE id=%s AND organization_id=%s", (member_id, organization_id))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
            
        cursor.execute("SELECT name FROM roles WHERE id=%s", (member["role_id"],))
        if cursor.fetchone()["name"] == "Organization Owner":
            cursor.execute("SELECT COUNT(*) as c FROM organization_members om JOIN roles r ON om.role_id = r.id WHERE om.organization_id=%s AND r.name='Organization Owner'", (organization_id,))
            if cursor.fetchone()["c"] <= 1:
                raise HTTPException(status_code=400, detail="Cannot demote the last Organization Owner")

        cursor.execute("SELECT name FROM roles WHERE id=%s", (payload.role_id,))
        new_role = cursor.fetchone()
        if not new_role or new_role["name"] == "Client Portal User":
            raise HTTPException(status_code=400, detail="Invalid role selected")

        cursor.execute("UPDATE organization_members SET role_id=%s WHERE id=%s RETURNING *", (payload.role_id, member_id))
        conn.commit()
        log_action(organization_id, actual_user_id, "member_role_changed", "team", member_id, "Role changed")
        return {"message": "Role updated"}

@router.delete("/member/{member_id}")
def remove_member(member_id: int, organization_id: int = Depends(require_permission("users.manage"))):
    actual_user_id = current_actual_user_id.get()
    with conn.cursor() as cursor:
        cursor.execute("SELECT role_id, user_id FROM organization_members WHERE id=%s AND organization_id=%s", (member_id, organization_id))
        member = cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
            
        if member["user_id"] == actual_user_id:
            raise HTTPException(status_code=400, detail="You cannot remove yourself")

        cursor.execute("SELECT name FROM roles WHERE id=%s", (member["role_id"],))
        if cursor.fetchone()["name"] == "Organization Owner":
            cursor.execute("SELECT COUNT(*) as c FROM organization_members om JOIN roles r ON om.role_id = r.id WHERE om.organization_id=%s AND r.name='Organization Owner'", (organization_id,))
            if cursor.fetchone()["c"] <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last Organization Owner")

        cursor.execute("DELETE FROM organization_members WHERE id=%s", (member_id,))
        conn.commit()
        log_action(organization_id, actual_user_id, "member_removed", "team", member_id, "Member removed")
        return {"message": "Member removed"}

@router.delete("/invitations/{invitation_id}")
def revoke_invitation(invitation_id: int, organization_id: int = Depends(require_permission("users.manage"))):
    actual_user_id = current_actual_user_id.get()
    with conn.cursor() as cursor:
        cursor.execute("UPDATE invitations SET status='revoked' WHERE id=%s AND organization_id=%s AND status='pending'", (invitation_id, organization_id))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Pending invitation not found")
        conn.commit()
        log_action(organization_id, actual_user_id, "invitation_revoked", "team", invitation_id, "Invitation revoked")
        return {"message": "Invitation revoked"}

@router.get("/invitation/validate/{token}")
def validate_invitation(token: str):
    with conn.cursor() as cursor:
        cursor.execute("SELECT email, status, expires_at FROM invitations WHERE token=%s", (token,))
        inv = cursor.fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Invalid token")
        if inv["status"] != "pending":
            raise HTTPException(status_code=400, detail="Invitation is no longer valid")
        if inv["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invitation has expired")
        return {"email": inv["email"]}

# PUBLIC ROUTE
@router.post("/invitation/accept")
def accept_invitation(payload: AcceptInvitation):
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM invitations WHERE token=%s FOR UPDATE", (payload.token,))
        invitation = cursor.fetchone()
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invalid token")
        if invitation["status"] != "pending":
            raise HTTPException(status_code=400, detail="Invitation is no longer valid")
        if invitation["expires_at"] < datetime.utcnow():
            cursor.execute("UPDATE invitations SET status='expired' WHERE id=%s", (invitation["id"],))
            conn.commit()
            raise HTTPException(status_code=400, detail="Invitation has expired")
            
        if payload.email.lower() != invitation["email"].lower():
            raise HTTPException(status_code=403, detail="This invitation was issued for another email address.")

        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email=%s", (payload.email,))
        user = cursor.fetchone()
        
        if user:
            user_id = user["id"]
            logger.info(f"User {payload.email} already exists with ID {user_id}")
        else:
            hashed_pw = hash(payload.password)
            cursor.execute("INSERT INTO users (email, password) VALUES (%s, %s) RETURNING id", (payload.email, hashed_pw))
            user_id = cursor.fetchone()["id"]
            logger.info(f"Created new user {payload.email} with ID {user_id}")

        # Check if already a member
        cursor.execute("SELECT 1 FROM organization_members WHERE organization_id=%s AND user_id=%s", (invitation["organization_id"], user_id))
        if cursor.fetchone():
            logger.warning(f"User {user_id} is already a member of org {invitation['organization_id']}")
            # Update invitation status to accepted anyway since they successfully clicked it, or leave it pending?
            # Let's just mark it accepted since they clicked it.
            cursor.execute("UPDATE invitations SET status='accepted', accepted_at=NOW() WHERE id=%s", (invitation["id"],))
            conn.commit()
            raise HTTPException(status_code=400, detail="You are already a member of this organization")

        logger.info(f"Inserting member {user_id} into org {invitation['organization_id']}")
        cursor.execute("""
            INSERT INTO organization_members (organization_id, user_id, role_id)
            VALUES (%s, %s, %s)
        """, (invitation["organization_id"], user_id, invitation["role_id"]))

        logger.info(f"Marking invitation {invitation['id']} as accepted")
        cursor.execute("UPDATE invitations SET status='accepted', accepted_at=NOW() WHERE id=%s", (invitation["id"],))
        conn.commit()
        
        log_action(invitation["organization_id"], user_id, "invitation_accepted", "team", user_id, f"User {payload.email} joined")
        
        logger.info("Invitation acceptance transaction committed successfully")
        return {"message": "Invitation accepted successfully. You may now log in."}
