from fastapi import Depends, Header, HTTPException, status
from app.core.security import decode_access_token
from jose import JWTError

async def get_current_token_payload(
    authorization: str | None = Header(None, alias="Authorization"),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
        payload["_raw_token"] = token
        return payload
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

async def get_current_user_id(
    payload: dict = Depends(get_current_token_payload),
) -> int | None:
    return payload.get("user_id") or payload.get("sub")

async def get_current_org_id(
    payload: dict = Depends(get_current_token_payload),
) -> int:
    org_id = payload.get("organization_id") or payload.get("user_id") or payload.get("sub")
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing organization context in token",
        )
    try:
        return int(org_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid organization context in token",
        )


def require_permission(permission_code: str):
    async def permission_dep(
        payload: dict = Depends(get_current_token_payload),
    ) -> bool:
        role = payload.get("role")
        permissions = payload.get("permissions", [])

        if role == "Organization Owner" or permission_code in permissions:
            return True

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Missing required permission: {permission_code}",
        )

    return permission_dep
