from typing import AsyncGenerator

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException, ForbiddenException
from app.core.permissions import has_permission as check_permission
from app.core.security import decode_access_token
from app.database import async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_token_payload(
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    if not authorization.startswith("Bearer "):
        raise CredentialsException("Invalid authorization header format")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = decode_access_token(token)
        return payload
    except Exception:
        raise CredentialsException("Invalid or expired access token")


async def get_current_user_id(
    payload: dict = Depends(get_current_token_payload),
) -> int:
    return payload["user_id"]


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


def require_permission(permission_code: str):
    async def permission_dep(
        payload: dict = Depends(get_current_token_payload),
    ) -> bool:
        role = payload.get("role")
        permissions = payload.get("permissions", [])
        
        # Super admin role (Organization Owner) bypasses permission checks
        if role == "Organization Owner" or permission_code in permissions:
            return True
            
        raise ForbiddenException(f"Missing required permission: {permission_code}")

    return permission_dep
