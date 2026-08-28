"""AI chat router — /api/ai/* endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.core.config import settings
from app.schemas import (
    ChatRequest,
    ChatResponse,
    SessionResponse,
    HistoryResponse,
    MessageResponse,
    SuggestionResponse,
)
from app import crud
from app.prompts import PROMPTS, MODULE_SUGGESTIONS
from app.llm import get_provider
from app.context import get_context_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get an AI response."""
    # Validate module
    if req.module not in PROMPTS:
        raise HTTPException(400, f"Invalid module: {req.module}")

    # Validate input length
    if len(req.message) > settings.MAX_INPUT_LENGTH:
        raise HTTPException(400, f"Message too long (max {settings.MAX_INPUT_LENGTH} chars)")

    user_id = user["user_id"]
    org_id = user.get("organization_id", 0)

    # Get or create session
    if req.session_id:
        session = await crud.get_session(db, req.session_id, user_id)
        if not session:
            raise HTTPException(404, "Session not found")
        session_id = session.id
    else:
        # Auto-generate title from first message (first 60 chars)
        title = req.message[:60].strip()
        if len(req.message) > 60:
            title += "..."
        session = await crud.create_session(db, user_id, org_id, req.module, title)
        session_id = session.id

    # Save user message
    await crud.add_message(db, session_id, "user", req.message)

    # Build context
    raw_token = user.get("_raw_token", "")
    context_provider = get_context_provider(req.module)
    context_data = await context_provider.get_context(user_id, raw_token)

    # Build message history (last 10 messages for context window)
    history = await crud.get_history(db, session_id, limit=10)
    history_msgs = [{"role": m.role, "content": m.content} for m in history]

    # Build system prompt with context
    system_prompt = PROMPTS[req.module]
    if context_data:
        context_block = "\n\nCurrent Module Data:\n"
        for key, value in context_data.items():
            if key != "module":
                context_block += f"- {key}: {value}\n"
        system_prompt += context_block

    messages = [{"role": "system", "content": system_prompt}] + history_msgs

    # Call LLM
    try:
        provider = get_provider()
        response_text = await provider.chat(messages)
    except ValueError as e:
        raise HTTPException(503, f"AI provider not configured: {str(e)}")
    except Exception as e:
        logger.error("LLM error: %s", str(e))
        raise HTTPException(502, "AI service temporarily unavailable")

    # Save assistant message
    assistant_msg = await crud.add_message(db, session_id, "assistant", response_text)

    return ChatResponse(
        session_id=session_id,
        message=MessageResponse(
            id=assistant_msg.id,
            role=assistant_msg.role,
            content=assistant_msg.content,
            created_at=assistant_msg.created_at,
        ),
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    module: str | None = None,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List user's AI chat sessions, optionally filtered by module."""
    sessions = await crud.list_sessions(db, user["user_id"], module)
    return [
        SessionResponse(
            id=s.id,
            title=s.title,
            module=s.module,
            message_count=len(s.messages),
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sessions
    ]


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_history(
    session_id: str,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get message history for a session."""
    session = await crud.get_session(db, session_id, user["user_id"])
    if not session:
        raise HTTPException(404, "Session not found")

    messages = await crud.get_history(db, session_id)
    return HistoryResponse(
        session_id=session_id,
        messages=[
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a session and all its messages."""
    deleted = await crud.delete_session(db, session_id, user["user_id"])
    if not deleted:
        raise HTTPException(404, "Session not found")
    return {"detail": "Session deleted"}


@router.get("/suggestions/{module}", response_model=SuggestionResponse)
async def get_suggestions(
    module: str,
    user: dict = Depends(get_current_user_id),
):
    """Get module-specific suggestion prompts."""
    if module not in MODULE_SUGGESTIONS:
        raise HTTPException(400, f"Invalid module: {module}")
    return SuggestionResponse(
        module=module,
        suggestions=MODULE_SUGGESTIONS[module],
    )
