import logging
from contextlib import asynccontextmanager

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory

logger = logging.getLogger(__name__)


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


async def get_current_user_id(
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    """Decode JWT and return payload with user_id and organization_id."""
    if not authorization.startswith("Bearer "):
        raise Exception("Invalid authorization header format")
    token = authorization.removeprefix("Bearer ")
    try:
        from jose import jwt
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return {
            "user_id": int(payload.get("sub", 0)),
            "email": payload.get("email", ""),
            "role": payload.get("role", ""),
            "organization_id": payload.get("organization_id", 0),
            "organization_name": payload.get("organization_name", ""),
            "permissions": payload.get("permissions", []),
        }
    except Exception:
        raise Exception("Invalid or expired access token")
