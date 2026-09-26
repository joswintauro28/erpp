"""Database operations for AI sessions, messages, and analytics."""

import uuid
import time
from datetime import datetime, timezone, timedelta

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import AISession, AIMessage, AIAuditLog


def estimate_tokens(text: str) -> int:
    """Estimate token count using ~4 chars per token heuristic.
    
    Accurate enough for context window management without tiktoken dependency.
    """
    return max(1, len(text) // 4)


# ── Session Operations ──────────────────────────────────────────────

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


async def get_session(
    db: AsyncSession, session_id: str, user_id: int, organization_id: int | None = None
) -> AISession | None:
    stmt = (
        sa.select(AISession)
        .options(selectinload(AISession.messages))
        .where(AISession.id == session_id, AISession.user_id == user_id)
    )
    if organization_id:
        stmt = stmt.where(AISession.organization_id == organization_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_sessions(
    db: AsyncSession, user_id: int, module: str | None = None, organization_id: int | None = None
) -> list[AISession]:
    stmt = (
        sa.select(AISession)
        .options(selectinload(AISession.messages))
        .where(AISession.user_id == user_id)
    )
    if organization_id:
        stmt = stmt.where(AISession.organization_id == organization_id)
    if module:
        stmt = stmt.where(AISession.module == module)
    stmt = stmt.order_by(AISession.updated_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def delete_session(
    db: AsyncSession, session_id: str, user_id: int, organization_id: int | None = None
) -> bool:
    session = await get_session(db, session_id, user_id, organization_id)
    if not session:
        return False
    await db.delete(session)
    await db.flush()
    return True


async def clear_all_sessions(
    db: AsyncSession, user_id: int, module: str | None = None, organization_id: int | None = None
) -> int:
    """Delete all sessions for a user, optionally filtered by module and organization."""
    sessions = await list_sessions(db, user_id, module, organization_id)
    count = len(sessions)
    for s in sessions:
        await db.delete(s)
    await db.flush()
    return count


async def update_session_title(
    db: AsyncSession, session_id: str, user_id: int, title: str, organization_id: int | None = None
) -> AISession | None:
    session = await get_session(db, session_id, user_id, organization_id)
    if not session:
        return None
    session.title = title.strip()[:200]
    session.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return session


# ── Message Operations ──────────────────────────────────────────────

async def add_message(
    db: AsyncSession, session_id: str, role: str, content: str, token_count: int | None = None
) -> AIMessage:
    if token_count is None:
        token_count = estimate_tokens(content)

    msg = AIMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=role,
        content=content,
        token_count=token_count,
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


# ── Conversation Memory ─────────────────────────────────────────────

async def get_context_window(
    db: AsyncSession,
    session_id: str,
    max_messages: int = 20,
    token_budget: int = 6000,
) -> list[dict]:
    """Load messages fitting within a token budget for LLM context.
    
    Strategy:
    1. Load all messages for the session (up to max_messages)
    2. If total tokens exceed budget, keep the most recent messages that fit
    3. Return messages as dicts ready for the LLM provider
    """
    all_msgs = await get_history(db, session_id, limit=max_messages)

    if not all_msgs:
        return []

    # Calculate tokens for each message
    messages_with_tokens = []
    for m in all_msgs:
        tc = m.token_count or estimate_tokens(m.content)
        messages_with_tokens.append({
            "role": m.role,
            "content": m.content,
            "tokens": tc,
        })

    # Fit within budget — keep most recent messages first
    total = sum(m["tokens"] for m in messages_with_tokens)
    if total <= token_budget:
        return [{"role": m["role"], "content": m["content"]} for m in messages_with_tokens]

    # Trim oldest messages to fit budget
    result = []
    used_tokens = 0
    for m in reversed(messages_with_tokens):
        if used_tokens + m["tokens"] > token_budget:
            break
        result.insert(0, {"role": m["role"], "content": m["content"]})
        used_tokens += m["tokens"]

    return result


async def summarize_old_messages(
    db: AsyncSession,
    session_id: str,
    keep_recent: int = 15,
    llm_provider=None,
) -> str | None:
    """Summarize messages older than keep_recent for context compression.
    
    Returns a summary string that can be injected as a system message,
    or None if there's nothing to summarize.
    """
    all_msgs = await get_history(db, session_id, limit=100)

    if len(all_msgs) <= keep_recent:
        return None

    old_messages = all_msgs[:-keep_recent]
    if not old_messages:
        return None

    # Build a summarization prompt
    conversation_text = "\n".join(
        f"{m.role}: {m.content[:500]}" for m in old_messages
    )

    if llm_provider is None:
        # Fallback: simple truncation summary
        total_chars = sum(len(m.content) for m in old_messages)
        return f"[Summary of {len(old_messages)} earlier messages — {total_chars} characters of context]"

    try:
        summary = await llm_provider.chat([
            {"role": "system", "content": (
                "Summarize the following conversation between a user and an AI assistant "
                "in 2-3 sentences. Focus on key topics discussed, decisions made, and "
                "any unresolved questions. Be concise and factual."
            )},
            {"role": "user", "content": conversation_text[:4000]},
        ])
        return summary
    except Exception:
        # If summarization fails, return a simple placeholder
        return f"[Summary of {len(old_messages)} earlier messages in this session]"


# ── Audit Log ───────────────────────────────────────────────────────

async def log_interaction(
    db: AsyncSession,
    *,
    user_id: int,
    organization_id: int,
    session_id: str | None,
    module: str,
    action: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    response_time_ms: int = 0,
    success: bool = True,
    error_message: str | None = None,
    user_message_preview: str | None = None,
) -> AIAuditLog:
    """Record an AI interaction for audit and analytics."""
    log = AIAuditLog(
        user_id=user_id,
        organization_id=organization_id,
        session_id=session_id,
        module=module,
        action=action,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        response_time_ms=response_time_ms,
        success=success,
        error_message=error_message,
        user_message_preview=user_message_preview[:200] if user_message_preview else None,
    )
    db.add(log)
    await db.flush()
    return log


# ── Analytics Queries ───────────────────────────────────────────────

async def get_analytics_overview(
    db: AsyncSession, user_id: int, organization_id: int | None = None
) -> dict:
    """Get aggregated analytics for a user and organization."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Base conditions
    session_where = [AISession.user_id == user_id]
    audit_where = [AIAuditLog.user_id == user_id]
    if organization_id:
        session_where.append(AISession.organization_id == organization_id)
        audit_where.append(AIAuditLog.organization_id == organization_id)

    # Total messages
    msg_count = await db.scalar(
        sa.select(sa.func.count(AIMessage.id))
        .join(AISession)
        .where(*session_where)
    )

    # Total sessions
    session_count = await db.scalar(
        sa.select(sa.func.count(AISession.id))
        .where(*session_where)
    )

    # Token usage
    total_tokens = await db.scalar(
        sa.select(sa.func.coalesce(sa.func.sum(AIMessage.token_count), 0))
        .join(AISession)
        .where(*session_where)
    )

    # Average response time
    avg_time = await db.scalar(
        sa.select(sa.func.coalesce(sa.func.avg(AIAuditLog.response_time_ms), 0))
        .where(*audit_where, AIAuditLog.action.in_(["chat", "stream"]))
    )

    # Today's counts
    messages_today = await db.scalar(
        sa.select(sa.func.count(AIMessage.id))
        .join(AISession)
        .where(*session_where, AIMessage.created_at >= today_start)
    )

    sessions_today = await db.scalar(
        sa.select(sa.func.count(AISession.id))
        .where(*session_where, AISession.created_at >= today_start)
    )

    # Module usage breakdown
    module_rows = await db.execute(
        sa.select(AISession.module, sa.func.count(AISession.id))
        .where(*session_where)
        .group_by(AISession.module)
    )
    module_usage = {row[0]: row[1] for row in module_rows.all()}

    # Daily message counts (last 7 days)
    daily_rows = await db.execute(
        sa.select(
            sa.func.date(AIMessage.created_at).label("date"),
            sa.func.count(AIMessage.id).label("count"),
        )
        .join(AISession)
        .where(*session_where, AIMessage.created_at >= week_ago)
        .group_by(sa.func.date(AIMessage.created_at))
        .order_by(sa.func.date(AIMessage.created_at))
    )
    daily_counts = [{"date": str(row.date), "count": row.count} for row in daily_rows.all()]

    return {
        "total_messages": msg_count or 0,
        "total_sessions": session_count or 0,
        "total_tokens_used": total_tokens or 0,
        "avg_response_time_ms": int(avg_time or 0),
        "messages_today": messages_today or 0,
        "sessions_today": sessions_today or 0,
        "module_usage": module_usage,
        "daily_message_counts": daily_counts,
    }


async def get_module_analytics(
    db: AsyncSession, user_id: int, module: str, organization_id: int | None = None
) -> dict:
    """Get analytics for a specific module and organization."""
    session_where = [AISession.user_id == user_id, AISession.module == module]
    audit_where = [AIAuditLog.user_id == user_id, AIAuditLog.module == module]
    if organization_id:
        session_where.append(AISession.organization_id == organization_id)
        audit_where.append(AIAuditLog.organization_id == organization_id)

    # Message and session counts
    msg_count = await db.scalar(
        sa.select(sa.func.count(AIMessage.id))
        .join(AISession)
        .where(*session_where)
    )

    session_count = await db.scalar(
        sa.select(sa.func.count(AISession.id))
        .where(*session_where)
    )

    # Token usage
    total_tokens = await db.scalar(
        sa.select(sa.func.coalesce(sa.func.sum(AIMessage.token_count), 0))
        .join(AISession)
        .where(*session_where)
    )

    # Average response time
    avg_time = await db.scalar(
        sa.select(sa.func.coalesce(sa.func.avg(AIAuditLog.response_time_ms), 0))
        .where(*audit_where)
    )

    # Success rate
    total_interactions = await db.scalar(
        sa.select(sa.func.count(AIAuditLog.id))
        .where(*audit_where)
    )
    successful = await db.scalar(
        sa.select(sa.func.count(AIAuditLog.id))
        .where(*audit_where, AIAuditLog.success == True)
    )
    success_rate = (successful / total_interactions * 100) if total_interactions else 100.0

    # Top user messages (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    top_rows = await db.execute(
        sa.select(AIAuditLog.user_message_preview)
        .where(
            *audit_where,
            AIAuditLog.created_at >= thirty_days_ago,
            AIAuditLog.user_message_preview.isnot(None),
        )
        .order_by(AIAuditLog.created_at.desc())
        .limit(20)
    )
    top_queries = [row[0] for row in top_rows.all() if row[0]]

    return {
        "module": module,
        "total_messages": msg_count or 0,
        "total_sessions": session_count or 0,
        "total_tokens": total_tokens or 0,
        "avg_response_time_ms": int(avg_time or 0),
        "success_rate": round(success_rate, 1),
        "top_queries": top_queries[:10],
    }
