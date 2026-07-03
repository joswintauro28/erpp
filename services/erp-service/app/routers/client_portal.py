from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from app.database import conn, cursor
from app.auth.portal_oauth2 import get_portal_user, create_portal_access_token
from app.auth.permissions import require_permission
from app.utils import hash, verify
from app.services.audit import log_action
from app.auth.permissions import current_actual_user_id
from datetime import datetime, timedelta
import secrets

router = APIRouter(
    prefix="/portal",
    tags=["Client Portal"]
)

class InviteRequest(BaseModel):
    client_id: int
    email: EmailStr

class ActionRequest(BaseModel):
    client_id: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AcceptInvitationRequest(BaseModel):
    token: str
    password: str
    full_name: str

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

# ---------------------------------------------------------
# EMPLOYEE ROUTES (Manage Portal Access)
# ---------------------------------------------------------

@router.post("/invite")
def invite_client(req: InviteRequest, organization_id: int = Depends(require_permission("clients.manage"))):
    try:
        cursor.execute("SELECT id, name FROM clients WHERE id=%s AND owner_id=%s", (req.client_id, organization_id))
        client = cursor.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(days=7)

        cursor.execute("UPDATE client_portal_invitations SET status='expired' WHERE client_id=%s AND email=%s AND status='pending'", 
                      (req.client_id, req.email))

        user_id = current_actual_user_id.get()

        cursor.execute("""
            INSERT INTO client_portal_invitations (client_id, email, token, expires_at, invited_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (req.client_id, req.email, token, expires_at, user_id))
        
        log_action(organization_id, user_id, "client_portal_invited", "client", req.client_id, f"Invited client to portal: {req.email}")
        
        invite_link = f"http://localhost:5173/portal/accept-invitation?token={token}"
        
        try:
            from app.email_utils.email_utils import send_email, EmailNotConfigured
            subject = f"You have been invited to the Client Portal for {client['name']}"
            body = f"Hello,\n\nYou have been invited to the client portal.\n\nPlease click the link below to activate your account:\n{invite_link}\n\nThank you!"
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Client Portal Invitation</h2>
                    <p>Hello,</p>
                    <p>You have been invited to access the client portal for <strong>{client['name']}</strong>.</p>
                    <p>You can use the portal to securely view and manage your invoices, quotations, and payments.</p>
                    <div style="margin: 30px 0;">
                        <a href="{invite_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Activate Portal Account</a>
                    </div>
                    <p>Or copy this link to your browser:</p>
                    <p style="word-break: break-all; color: #666; font-size: 14px;">{invite_link}</p>
                    <p>This invitation link will expire in 7 days.</p>
                    <br>
                    <p>Thank you!</p>
                </body>
            </html>
            """
            send_email(organization_id, req.email, subject, body, html_body=html_body)
        except Exception as e:
            print(f"Failed to send email: {e}")
            # Do not fail transaction if email fails, it's already committed below
            
        conn.commit()
        return {"message": "Invitation sent successfully", "link": invite_link}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/access/{client_id}")
def get_portal_access(client_id: int, organization_id: int = Depends(require_permission("clients.manage"))):
    cursor.execute("SELECT id FROM clients WHERE id=%s AND owner_id=%s", (client_id, organization_id))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Client not found")

    cursor.execute("SELECT status, last_login, user_id FROM client_portal_access WHERE client_id=%s ORDER BY id DESC LIMIT 1", (client_id,))
    access = cursor.fetchone()
    
    cursor.execute("SELECT email, status FROM client_portal_invitations WHERE client_id=%s ORDER BY id DESC LIMIT 1", (client_id,))
    invitation = cursor.fetchone()
    
    portal_email = None
    if access and access["user_id"]:
        cursor.execute("SELECT email FROM users WHERE id=%s", (access["user_id"],))
        u = cursor.fetchone()
        if u:
            portal_email = u["email"]
    
    return {
        "status": access["status"] if access else "none",
        "last_login": access["last_login"] if access else None,
        "invitation_status": invitation["status"] if invitation else "none",
        "portal_email": portal_email or (invitation["email"] if invitation else None)
    }

@router.post("/resend-invitation")
def resend_invitation(req: ActionRequest, organization_id: int = Depends(require_permission("clients.manage"))):
    try:
        cursor.execute("SELECT id, name FROM clients WHERE id=%s AND owner_id=%s", (req.client_id, organization_id))
        client = cursor.fetchone()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        cursor.execute("SELECT * FROM client_portal_invitations WHERE client_id=%s AND status='pending' ORDER BY id DESC LIMIT 1", (req.client_id,))
        invitation = cursor.fetchone()
        if not invitation:
            raise HTTPException(status_code=400, detail="No pending invitation to resend")

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(days=7)

        cursor.execute("UPDATE client_portal_invitations SET status='expired' WHERE client_id=%s AND status='pending'", (req.client_id,))
        
        user_id = current_actual_user_id.get()
        cursor.execute("""
            INSERT INTO client_portal_invitations (client_id, email, token, expires_at, invited_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (req.client_id, invitation["email"], token, expires_at, user_id))
        
        log_action(organization_id, user_id, "client_portal_invited", "client", req.client_id, f"Resent client portal invitation to {invitation['email']}")
        
        invite_link = f"http://localhost:5173/portal/accept-invitation?token={token}"
        
        try:
            from app.email_utils.email_utils import send_email, EmailNotConfigured
            subject = f"You have been invited to the Client Portal for {client['name']} (Resent)"
            body = f"Hello,\n\nYou have been invited to the client portal.\n\nPlease click the link below to activate your account:\n{invite_link}\n\nThank you!"
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Client Portal Invitation</h2>
                    <p>Hello,</p>
                    <p>You have been invited to access the client portal for <strong>{client['name']}</strong>.</p>
                    <p>You can use the portal to securely view and manage your invoices, quotations, and payments.</p>
                    <div style="margin: 30px 0;">
                        <a href="{invite_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Activate Portal Account</a>
                    </div>
                    <p>Or copy this link to your browser:</p>
                    <p style="word-break: break-all; color: #666; font-size: 14px;">{invite_link}</p>
                    <p>This invitation link will expire in 7 days.</p>
                    <br>
                    <p>Thank you!</p>
                </body>
            </html>
            """
            send_email(organization_id, invitation["email"], subject, body, html_body=html_body)
        except Exception as e:
            print(f"Failed to send email: {e}")
            
        conn.commit()

        return {"message": "Invitation resent successfully", "link": invite_link}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/revoke")
def revoke_access(req: ActionRequest, organization_id: int = Depends(require_permission("clients.manage"))):
    try:
        cursor.execute("SELECT id FROM clients WHERE id=%s AND owner_id=%s", (req.client_id, organization_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Client not found")
            
        cursor.execute("UPDATE client_portal_access SET status='disabled' WHERE client_id=%s", (req.client_id,))
        cursor.execute("UPDATE client_portal_invitations SET status='revoked' WHERE client_id=%s AND status='pending'", (req.client_id,))
        
        user_id = current_actual_user_id.get()
        log_action(organization_id, user_id, "client_portal_revoked", "client", req.client_id, "Revoked portal access completely")
        conn.commit()
        return {"message": "Access revoked"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disable")
def disable_access(req: ActionRequest, organization_id: int = Depends(require_permission("clients.manage"))):
    try:
        cursor.execute("SELECT id FROM clients WHERE id=%s AND owner_id=%s", (req.client_id, organization_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Client not found")
            
        cursor.execute("UPDATE client_portal_access SET status='suspended' WHERE client_id=%s AND status='active'", (req.client_id,))
        
        user_id = current_actual_user_id.get()
        log_action(organization_id, user_id, "client_portal_disabled", "client", req.client_id, "Suspended portal access temporarily")
        conn.commit()
        return {"message": "Access suspended"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# PUBLIC ROUTES (No Auth Required)
# ---------------------------------------------------------

@router.post("/login")
def login(req: LoginRequest):
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s", (req.email,))
        user = cursor.fetchone()
        if not user or not verify(req.password, user["password"]):
            raise HTTPException(status_code=403, detail="Invalid Credentials")

        cursor.execute("SELECT * FROM client_portal_access WHERE user_id = %s", (user["id"],))
        access = cursor.fetchone()
        if not access:
            raise HTTPException(status_code=403, detail="Access denied. Please use the Employee login.")

        if access["status"] == "suspended":
            raise HTTPException(status_code=403, detail="Portal access suspended")
        if access["status"] == "disabled":
            raise HTTPException(status_code=403, detail="Portal access revoked")
            
        cursor.execute("UPDATE client_portal_access SET last_login = CURRENT_TIMESTAMP WHERE user_id=%s", (user["id"],))
        cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id=%s", (user["id"],))
        
        # Get owner_id for audit logging
        cursor.execute("SELECT owner_id FROM clients WHERE id=%s", (access["client_id"],))
        client = cursor.fetchone()
        if client:
            log_action(client["owner_id"], user["id"], "client_portal_login", "client", access["client_id"], f"Client logged into portal: {user['email']}")
            
        conn.commit()

        token = create_portal_access_token(data={"user_id": user["id"], "client_id": access["client_id"], "portal": True})

        return {"access_token": token, "token_type": "bearer", "client_id": access["client_id"]}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invitation/validate")
def validate_invitation(token: str):
    cursor.execute("SELECT * FROM client_portal_invitations WHERE token=%s AND status='pending'", (token,))
    invitation = cursor.fetchone()
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invalid or expired invitation")
        
    if invitation["expires_at"] < datetime.now():
        cursor.execute("UPDATE client_portal_invitations SET status='expired' WHERE id=%s", (invitation["id"],))
        conn.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")

    cursor.execute("SELECT name FROM clients WHERE id=%s", (invitation["client_id"],))
    client = cursor.fetchone()

    return {"valid": True, "email": invitation["email"], "client_name": client["name"]}

@router.post("/invitation/accept")
def accept_invitation(req: AcceptInvitationRequest):
    try:
        cursor.execute("SELECT * FROM client_portal_invitations WHERE token=%s AND status='pending'", (req.token,))
        invitation = cursor.fetchone()
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invalid invitation token")
            
        if invitation["expires_at"] < datetime.now():
            raise HTTPException(status_code=400, detail="Invitation has expired")

        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email=%s", (invitation["email"],))
        user = cursor.fetchone()
        
        hashed_pw = hash(req.password)
        
        if user:
            user_id = user["id"]
            cursor.execute("UPDATE users SET password=%s, full_name=%s WHERE id=%s", (hashed_pw, req.full_name, user_id))
        else:
            cursor.execute("INSERT INTO users (email, password, full_name) VALUES (%s, %s, %s) RETURNING id", 
                          (invitation["email"], hashed_pw, req.full_name))
            user_id = cursor.fetchone()["id"]

        # Grant access
        cursor.execute("""
            INSERT INTO client_portal_access (client_id, user_id, status)
            VALUES (%s, %s, 'active')
            ON CONFLICT (client_id, user_id) DO UPDATE SET status='active'
        """, (invitation["client_id"], user_id))
        
        # Mark invite accepted
        cursor.execute("UPDATE client_portal_invitations SET status='accepted', accepted_at=CURRENT_TIMESTAMP WHERE id=%s", (invitation["id"],))
        
        # Get owner_id for audit log
        cursor.execute("SELECT owner_id, name FROM clients WHERE id=%s", (invitation["client_id"],))
        client = cursor.fetchone()
        if client:
            log_action(client["owner_id"], user_id, "client_portal_activated", "client", invitation["client_id"], f"Client {client['name']} activated portal access")
        
        conn.commit()
        
        return {"message": "Portal account created successfully. You can now log in."}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# PORTAL ROUTES (Require Portal Auth)
# ---------------------------------------------------------

@router.get("/dashboard")
def get_dashboard(portal: dict = Depends(get_portal_user)):
    client_id = portal["client_id"]
    cursor.execute("SELECT SUM(total) as total_invoices, SUM(balance_due) as outstanding FROM invoices WHERE client_id=%s AND status != 'draft'", (client_id,))
    invoice_stats = cursor.fetchone() or {"total_invoices": 0, "outstanding": 0}
    
    cursor.execute("SELECT COUNT(id) as total_quotes FROM quotations WHERE client_id=%s", (client_id,))
    quote_stats = cursor.fetchone() or {"total_quotes": 0}
    
    cursor.execute("""
        SELECT p.*, i.invoice_number 
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE i.client_id=%s
        ORDER BY p.created_at DESC LIMIT 5
    """, (client_id,))
    recent_payments = cursor.fetchall()

    cursor.execute("""
        SELECT id, invoice_number, total, balance_due, status, due_date
        FROM invoices
        WHERE client_id=%s AND status != 'draft'
        ORDER BY created_at DESC LIMIT 5
    """, (client_id,))
    recent_invoices = cursor.fetchall()
    
    return {
        "outstanding_amount": invoice_stats["outstanding"] or 0,
        "total_invoiced": invoice_stats["total_invoices"] or 0,
        "total_quotations": quote_stats["total_quotes"] or 0,
        "recent_payments": recent_payments,
        "recent_invoices": recent_invoices
    }

@router.get("/invoices")
def get_invoices(portal: dict = Depends(get_portal_user)):
    cursor.execute("SELECT * FROM invoices WHERE client_id=%s AND status != 'draft' ORDER BY created_at DESC", (portal["client_id"],))
    return {"data": cursor.fetchall()}

@router.get("/invoices/{invoice_id}")
def get_invoice_details(invoice_id: int, portal: dict = Depends(get_portal_user)):
    cursor.execute("SELECT * FROM invoices WHERE id=%s AND client_id=%s AND status != 'draft'", (invoice_id, portal["client_id"]))
    invoice = cursor.fetchone()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    cursor.execute("SELECT * FROM invoice_items WHERE invoice_id=%s", (invoice_id,))
    items = cursor.fetchall()
    
    return {"data": {"invoice": invoice, "items": items}}

@router.get("/invoices/{invoice_id}/pdf")
def download_portal_invoice_pdf(invoice_id: int, portal: dict = Depends(get_portal_user)):
    from app.services.pdf_generator import generate_invoice_pdf
    
    cursor.execute("SELECT * FROM invoices WHERE id=%s AND client_id=%s AND status != 'draft'", (invoice_id, portal["client_id"]))
    invoice = cursor.fetchone()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    try:
        pdf_bytes = generate_invoice_pdf(invoice_id)
        from fastapi.responses import Response
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/invoices/{invoice_id}/pay")
def pay_portal_invoice(invoice_id: int, portal: dict = Depends(get_portal_user)):
    try:
        cursor.execute("SELECT owner_id, status, balance_due, amount FROM invoices WHERE id=%s AND client_id=%s", (invoice_id, portal["client_id"]))
        invoice = cursor.fetchone()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice["status"] == 'cancelled':
            raise HTTPException(status_code=400, detail="Cannot pay a cancelled invoice")
            
        balance = invoice.get("balance_due") or invoice.get("total") or invoice.get("amount")
        if not balance or balance <= 0:
            raise HTTPException(status_code=400, detail="Invoice is already fully paid")

        from app.routers.payments import create_payment_link
        from app.schemas.payment import PaymentLinkCreate
        
        payload = PaymentLinkCreate(invoice_id=invoice_id)
        # Call the existing create_payment_link logic acting as the invoice owner
        return create_payment_link(payload, current_user=invoice["owner_id"])
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/quotations")
def get_quotations(portal: dict = Depends(get_portal_user)):
    cursor.execute("SELECT * FROM quotations WHERE client_id=%s ORDER BY created_at DESC", (portal["client_id"],))
    return {"data": cursor.fetchall()}

@router.get("/quotations/{quotation_id}/pdf")
def download_portal_quotation_pdf(quotation_id: int, portal: dict = Depends(get_portal_user)):
    from app.services.pdf_generator import generate_quotation_pdf
    
    cursor.execute("SELECT * FROM quotations WHERE id=%s AND client_id=%s", (quotation_id, portal["client_id"]))
    quote = cursor.fetchone()
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found")
        
    try:
        pdf_bytes = generate_quotation_pdf(quotation_id)
        from fastapi.responses import Response
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@router.post("/quotations/{quotation_id}/accept")
def accept_quotation(quotation_id: int, portal: dict = Depends(get_portal_user)):
    try:
        cursor.execute("SELECT * FROM quotations WHERE id=%s AND client_id=%s", (quotation_id, portal["client_id"]))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="Quotation not found")
            
        cursor.execute("UPDATE quotations SET status='accepted' WHERE id=%s", (quotation_id,))
        
        cursor.execute("SELECT name FROM clients WHERE id=%s", (portal["client_id"],))
        client_name = cursor.fetchone()["name"]
        
        # Log action
        log_action(quote["owner_id"], portal["user_id"], "quotation_accepted_by_client", "quotation", quotation_id, f"Client {client_name} accepted quotation {quote['quote_number']}")
        
        conn.commit()
        return {"message": "Quotation accepted successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quotations/{quotation_id}/reject")
def reject_quotation(quotation_id: int, portal: dict = Depends(get_portal_user)):
    try:
        cursor.execute("SELECT * FROM quotations WHERE id=%s AND client_id=%s", (quotation_id, portal["client_id"]))
        quote = cursor.fetchone()
        if not quote:
            raise HTTPException(status_code=404, detail="Quotation not found")
            
        cursor.execute("UPDATE quotations SET status='rejected' WHERE id=%s", (quotation_id,))
        
        cursor.execute("SELECT name FROM clients WHERE id=%s", (portal["client_id"],))
        client_name = cursor.fetchone()["name"]
        
        # Log action
        log_action(quote["owner_id"], portal["user_id"], "quotation_rejected_by_client", "quotation", quotation_id, f"Client {client_name} rejected quotation {quote['quote_number']}")
        
        conn.commit()
        return {"message": "Quotation rejected successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payments")
def get_payments(portal: dict = Depends(get_portal_user)):
    cursor.execute("""
        SELECT p.*, i.invoice_number 
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.id
        WHERE i.client_id=%s
        ORDER BY p.created_at DESC
    """, (portal["client_id"],))
    return {"data": cursor.fetchall()}

@router.get("/profile")
def get_profile(portal: dict = Depends(get_portal_user)):
    cursor.execute("SELECT id, name, email, phone, address, state, gst_number FROM clients WHERE id=%s", (portal["client_id"],))
    client = cursor.fetchone()
    
    cursor.execute("SELECT id, email, full_name, last_login FROM users WHERE id=%s", (portal["user_id"],))
    user = cursor.fetchone()
    
    return {"user": user, "client": client}

@router.put("/profile/password")
def update_password(req: PasswordUpdate, portal: dict = Depends(get_portal_user)):
    try:
        cursor.execute("SELECT password FROM users WHERE id=%s", (portal["user_id"],))
        user = cursor.fetchone()
        
        if not verify(req.current_password, user["password"]):
            raise HTTPException(status_code=400, detail="Incorrect current password")
            
        cursor.execute("UPDATE users SET password=%s WHERE id=%s", (hash(req.new_password), portal["user_id"]))
        conn.commit()
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
