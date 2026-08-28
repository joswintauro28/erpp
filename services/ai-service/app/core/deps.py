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
    return {
        "user_id": payload.get("sub") or payload.get("user_id", 0),
        "email": payload.get("email", ""),
        "role": payload.get("role", ""),
        "organization_id": payload.get("organization_id", 0),
        "organization_name": payload.get("organization_name", ""),
        "permissions": payload.get("permissions", []),
        "_raw_token": payload.get("_raw_token", ""),
    }
