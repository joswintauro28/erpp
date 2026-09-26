from fastapi import Depends, Header

from app.core.exceptions import CredentialsException, ForbiddenException
from app.core.security import decode_access_token


async def get_current_token_payload(
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    if not authorization.startswith("Bearer "):
        raise CredentialsException("Invalid authorization header format")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
        payload["_raw_token"] = token
        return payload
    except Exception:
        raise CredentialsException("Invalid or expired access token")


async def get_current_user_id(
    payload: dict = Depends(get_current_token_payload),
) -> int:
    return payload["user_id"]


async def get_current_org_id(
    payload: dict = Depends(get_current_token_payload),
) -> int:
    raw = payload.get("organization_id") or payload.get("org_id") or payload.get("user_id") or payload.get("sub") or 1
    try:
        val = int(raw)
        return val if val > 0 else 1
    except (ValueError, TypeError):
        return 1


async def get_optional_user_id(
    authorization: str | None = Header(None, alias="Authorization"),
) -> int | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = decode_access_token(authorization.removeprefix("Bearer "))
        return payload["user_id"]
    except Exception:
        return None


PERMISSION_ALIASES: dict[str, list[str]] = {
    "clients.view": ["customers.view"],
    "clients.create": ["customers.create"],
    "clients.edit": ["customers.edit"],
    "clients.delete": ["customers.delete"],
}


def require_permission(permission_code: str):
    async def permission_dep(
        payload: dict = Depends(get_current_token_payload),
    ) -> bool:
        role = payload.get("role")
        permissions = payload.get("permissions", [])

        if role == "Organization Owner":
            return True

        if permission_code in permissions:
            return True

        # Fallback aliases if an older client sends a legacy code
        aliases = PERMISSION_ALIASES.get(permission_code, [])
        if any(alias in permissions for alias in aliases):
            return True

        raise ForbiddenException(f"Missing required permission: {permission_code}")

    return permission_dep
