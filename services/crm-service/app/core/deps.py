from typing import AsyncGenerator

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CredentialsException
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


def parse_numeric_value(val_str):
    if val_str is None:
        return 0.0
    val_str = str(val_str)
    clean_str = val_str.replace("₹", "").replace("$", "").replace(",", "").strip()
    try:
        return float(clean_str) if clean_str else 0.0
    except ValueError:
        return 0.0


def generic_summary(data, status_field='status', active_vals=None, attention_vals=None):
    total = len(data)
    active = len([d for d in data if getattr(d, status_field, '') in (active_vals or [])])
    attention = len([d for d in data if getattr(d, status_field, '') in (attention_vals or [])])

    unique_owners = set()
    for d in data:
        owner = getattr(d, 'owner_id', None)
        if owner:
            unique_owners.add(owner)

    owners = len(unique_owners)
    return {"total": total, "active": active, "attention": attention, "owners": owners}


async def get_current_token_payload(
    authorization: str | None = Header(None, alias="Authorization"),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
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
