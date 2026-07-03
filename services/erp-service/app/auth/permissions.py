from fastapi import Depends, HTTPException, status
from app.auth.oauth2 import oauth2_scheme, get_current_user as get_jwt_user_id
from app.database import conn
import contextvars

# Context variable to hold the actual authenticated user ID for audit logging
current_actual_user_id = contextvars.ContextVar("current_actual_user_id", default=None)

def require_permission(permission_code: str):
    def dependency(user_id: int = Depends(get_jwt_user_id)):
        # Set the actual user ID in the context for audit logging
        current_actual_user_id.set(user_id)
        
        with conn.cursor() as cursor:
            # 1. Resolve organization membership and role
            # For now, we assume the user is operating in the first active organization they belong to.
            # Typically, this would be passed in a header (e.g. X-Organization-ID), but to preserve existing
            # functionality without frontend changes, we select their primary active membership.
            # We prioritize Organizations they own (is_system_role=True, name='Organization Owner' usually ID 1)
            cursor.execute("""
                SELECT om.organization_id, om.role_id, r.name as role_name 
                FROM organization_members om
                JOIN roles r ON om.role_id = r.id
                WHERE om.user_id = %s AND om.status = 'active'
                ORDER BY r.id ASC
                LIMIT 1
            """, (user_id,))
            
            membership = cursor.fetchone()
            
            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You do not belong to any active organization."
                )
            
            organization_id = membership["organization_id"]
            role_id = membership["role_id"]
            role_name = membership["role_name"]
            
            # Organization Owner always has full access
            if role_name == "Organization Owner":
                return organization_id
                
            # 2. Resolve specific permission
            cursor.execute("""
                SELECT p.code
                FROM role_permissions rp
                JOIN permissions p ON rp.permission_id = p.id
                WHERE rp.role_id = %s AND p.code = %s
            """, (role_id, permission_code))
            
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access Denied. Required permission: {permission_code}"
                )
                
            return organization_id
            
    return dependency

def get_auth_context(user_id: int):
    with conn.cursor() as cursor:
        cursor.execute("SELECT id, email, full_name, last_login FROM users WHERE id=%s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return None
            
        cursor.execute("""
            SELECT om.organization_id, o.name as organization_name, r.name as role_name, r.id as role_id, om.status, om.joined_at, o.owner_id
            FROM organization_members om
            JOIN roles r ON om.role_id = r.id
            JOIN organizations o ON om.organization_id = o.id
            WHERE om.user_id = %s AND om.status = 'active'
            ORDER BY r.id ASC
            LIMIT 1
        """, (user_id,))
        
        membership = cursor.fetchone()
        
        permissions = []
        organization_id = None
        organization_name = None
        role_name = None
        status = "active"
        joined_at = None
        is_owner = False
        
        if membership:
            organization_id = membership["organization_id"]
            organization_name = membership["organization_name"]
            role_name = membership["role_name"]
            role_id = membership["role_id"]
            status = membership["status"]
            joined_at = membership["joined_at"]
            is_owner = (user_id == membership["owner_id"])
            
            if role_name == "Organization Owner":
                cursor.execute("SELECT code FROM permissions")
                permissions = [p["code"] for p in cursor.fetchall()]
            else:
                cursor.execute("""
                    SELECT p.code
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = %s
                """, (role_id,))
                permissions = [p["code"] for p in cursor.fetchall()]
                
        return {
            "id": user["id"],
            "email": user["email"],
            "full_name": user.get("full_name") or user["email"].split('@')[0].capitalize(),
            "last_login": user.get("last_login"),
            "organization_id": organization_id,
            "organization_name": organization_name,
            "role": role_name,
            "permissions": permissions,
            "status": status,
            "joined_at": joined_at,
            "is_owner": is_owner
        }
