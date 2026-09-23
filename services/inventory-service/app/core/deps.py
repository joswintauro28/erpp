from typing import AsyncGenerator

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException, ForbiddenException
from app.core.security import decode_access_token
from app.core.database import async_session_factory


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
        payload["_raw_token"] = token
        return payload
    except Exception:
        raise CredentialsException("Invalid or expired access token")


async def get_current_org_id(
    payload: dict = Depends(get_current_token_payload),
) -> int:
    return payload.get("organization_id", payload["user_id"])


PERMISSION_ALIASES: dict[str, list[str]] = {
    "purchase_orders.view": ["stock.view", "suppliers.view"],
    "purchase_orders.create": ["stock.manage", "suppliers.create", "suppliers.manage"],
    "purchase_orders.manage": ["stock.manage", "suppliers.manage"],
    "purchase_orders.delete": ["stock.manage", "suppliers.manage"],
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

        # Check aliases
        aliases = PERMISSION_ALIASES.get(permission_code, [])
        if any(alias in permissions for alias in aliases):
            return True

        raise ForbiddenException(f"Missing required permission: {permission_code}")

    return permission_dep
