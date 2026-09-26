from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException
from app.core.security import decode_access_token
from app.core.database import async_session_factory


async def get_db():
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


async def get_current_user_id(
    payload: dict = Depends(get_current_token_payload),
) -> dict:
    user_id_raw = payload.get("sub") or payload.get("user_id") or 0
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        user_id = 0

    org_id_raw = payload.get("organization_id") or payload.get("org_id") or user_id or 1
    try:
        organization_id = int(org_id_raw)
        if organization_id <= 0:
            organization_id = 1
    except (ValueError, TypeError):
        organization_id = 1

    return {
        "user_id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("role", ""),
        "organization_id": organization_id,
        "organization_name": payload.get("organization_name", ""),
        "permissions": payload.get("permissions", []),
        "_raw_token": payload.get("_raw_token", ""),
    }
