"""Database operations for AI sessions and messages."""

import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AISession, AIMessage


async def create_session(
    db: AsyncSession, user_id: int, organization_id: int, module: str, title: str = "New Chat"
) -> AISession:
    session = AISession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        organization_id=organization_id,
        module=module,
        title=title,
    )
    db.add(session)
    await db.flush()
    return session


async def get_session(db: AsyncSession, session_id: str, user_id: int) -> AISession | None:
    stmt = (
        sa.select(AISession)
        .options(selectinload(AISession.messages))
        .where(AISession.id == session_id, AISession.user_id == user_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_sessions(
    db: AsyncSession, user_id: int, module: str | None = None
) -> list[AISession]:
    stmt = (
        sa.select(AISession)
        .options(selectinload(AISession.messages))
        .where(AISession.user_id == user_id)
    )
    if module:
        stmt = stmt.where(AISession.module == module)
    stmt = stmt.order_by(AISession.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_session(db: AsyncSession, session_id: str, user_id: int) -> bool:
    session = await get_session(db, session_id, user_id)
    if not session:
        return False
    await db.delete(session)
    await db.flush()
    return True


async def update_session_title(db: AsyncSession, session_id: str, user_id: int, title: str) -> AISession | None:
    session = await get_session(db, session_id, user_id)
    if not session:
        return None
    session.title = title
    await db.flush()
    return session


async def add_message(
    db: AsyncSession, session_id: str, role: str, content: str
) -> AIMessage:
    msg = AIMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=role,
        content=content,
    )
    db.add(msg)
    # Update session's updated_at timestamp
    stmt = sa.select(AISession).where(AISession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session:
        session.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return msg


async def get_history(db: AsyncSession, session_id: str, limit: int = 50) -> list[AIMessage]:
    stmt = (
        sa.select(AIMessage)
        .where(AIMessage.session_id == session_id)
        .order_by(AIMessage.created_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
