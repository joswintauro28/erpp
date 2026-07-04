from fastapi import Depends, HTTPException, status
from app.auth.oauth2 import get_current_user as get_jwt_user_id
from app.database import get_db
import contextvars

# Context variable to hold the actual authenticated user ID for audit logging
current_actual_user_id: contextvars.ContextVar[int | None] = contextvars.ContextVar(
    "current_actual_user_id", default=None
)


def require_permission(permission_code: str):
    def dependency(user_id: int = Depends(get_jwt_user_id)):
        current_actual_user_id.set(user_id)

        with get_db() as connection:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT om.organization_id, om.role_id, r.name AS role_name
                    FROM organization_members om
                    JOIN roles r ON om.role_id = r.id
                    WHERE om.user_id = %s AND om.status = 'active'
                    ORDER BY r.id ASC
                    LIMIT 1
                    """,
                    (user_id,),
                )
                membership = cur.fetchone()

        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not belong to any active organization.",
            )

        organization_id = membership["organization_id"]
        role_id = membership["role_id"]
        role_name = membership["role_name"]

        if role_name == "Organization Owner":
            return user_id

        with get_db() as connection:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT p.code
                    FROM role_permissions rp
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE rp.role_id = %s AND p.code = %s
                    """,
                    (role_id, permission_code),
                )
                if not cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access Denied. Required permission: {permission_code}",
                    )

        return user_id

    return dependency


def get_auth_context(user_id: int):
    with get_db() as connection:
        with connection.cursor() as cur:
            cur.execute(
                "SELECT id, email, full_name, last_login FROM users WHERE id = %s",
                (user_id,),
            )
            user = cur.fetchone()
            if not user:
                return None

            cur.execute(
                """
                SELECT om.organization_id, o.name AS organization_name,
                       r.name AS role_name, r.id AS role_id,
                       om.status, om.joined_at, o.owner_id
                FROM organization_members om
                JOIN roles r ON om.role_id = r.id
                JOIN organizations o ON om.organization_id = o.id
                WHERE om.user_id = %s AND om.status = 'active'
                ORDER BY r.id ASC
                LIMIT 1
                """,
                (user_id,),
            )
            membership = cur.fetchone()

    permissions: list[str] = []
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
        is_owner = user_id == membership["owner_id"]

        with get_db() as connection:
            with connection.cursor() as cur:
                if role_name == "Organization Owner":
                    cur.execute("SELECT code FROM permissions")
                    permissions = [p["code"] for p in cur.fetchall()]
                else:
                    cur.execute(
                        """
                        SELECT p.code
                        FROM role_permissions rp
                        JOIN permissions p ON rp.permission_id = p.id
                        WHERE rp.role_id = %s
                        """,
                        (role_id,),
                    )
                    permissions = [p["code"] for p in cur.fetchall()]

    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name") or user["email"].split("@")[0].capitalize(),
        "last_login": user.get("last_login"),
        "organization_id": organization_id,
        "organization_name": organization_name,
        "role": role_name,
        "permissions": permissions,
        "status": status,
        "joined_at": joined_at,
        "is_owner": is_owner,
    }
