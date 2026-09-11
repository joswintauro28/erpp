"""AI chat router — /api/ai/* endpoints with streaming, rate limiting, and analytics."""

import json
import time
import logging

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.core.config import settings
from app.core.exceptions import (
    ValidationException,
    NotFoundException,
    ServiceUnavailableException,
    TooManyRequestsException,
    ForbiddenException,
)
from app.core.rate_limiter import rate_limiter
from app.schemas import (
    ChatRequest,
    ChatResponse,
    SessionResponse,
    SessionUpdate,
    ClearSessionsResponse,
    HistoryResponse,
    MessageResponse,
    SuggestionResponse,
    DynamicSuggestion,
    DynamicSuggestionsResponse,
    StreamChunk,
    AnalyticsOverview,
    AnalyticsModule,
)
from app import crud
from app.prompts import PROMPTS, MODULE_SUGGESTIONS, build_dynamic_suggestions
from app.llm import get_provider
from app.context import get_context_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


# ── Permission Check ────────────────────────────────────────────────

def _check_module_permission(user: dict, module: str):
    """Validate user has permission to access the given module."""
    required = settings.MODULE_PERMISSIONS.get(module, [])
    if not required:
        return  # No extra permission needed

    user_permissions = user.get("permissions", [])
    user_role = user.get("role", "")

    # Admin roles bypass permission checks
    if user_role in ("Organization Owner", "Admin", "Super Admin"):
        return

    # Check if user has ANY of the module's permissions
    if not any(perm in user_permissions for perm in required):
        raise ForbiddenException(
            f"Insufficient permissions for {module} module. "
            f"Required: {', '.join(required)}"
        )


# ── Chat Endpoints ─────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    request: Request,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get an AI response."""
    # Rate limit
    user_id = user["user_id"]
    allowed, headers = rate_limiter.is_allowed(user_id)
    if not allowed:
        raise TooManyRequestsException(
            f"Rate limit exceeded. Max {settings.AI_RATE_LIMIT} requests per minute."
        )

    # Validate module
    if req.module not in PROMPTS:
        raise ValidationException(f"Invalid module: {req.module}. Supported: {', '.join(PROMPTS.keys())}")

    # Validate input length
    if len(req.message) > settings.MAX_INPUT_LENGTH:
        raise ValidationException(f"Message too long (max {settings.MAX_INPUT_LENGTH} chars)")

    # Permission check
    _check_module_permission(user, req.module)

    org_id = user.get("organization_id", 0)
    start_time = time.time()

    # Get or create session
    if req.session_id:
        session = await crud.get_session(db, req.session_id, user_id)
        if not session:
            raise NotFoundException("Session not found")
        session_id = session.id
    else:
        title = req.message[:60].strip()
        if len(req.message) > 60:
            title += "..."
        session = await crud.create_session(db, user_id, org_id, req.module, title)
        session_id = session.id

    # Save user message
    input_tokens = crud.estimate_tokens(req.message)
    await crud.add_message(db, session_id, "user", req.message, input_tokens)

    # Build context
    raw_token = user.get("_raw_token", "")
    context_provider = get_context_provider(req.module)
    context_data = await context_provider.get_context(user_id, raw_token)

    # Build conversation memory — token-aware context window
    history = await crud.get_context_window(
        db, session_id,
        max_messages=settings.CONTEXT_WINDOW_MESSAGES,
        token_budget=settings.CONTEXT_TOKEN_BUDGET,
    )

    # Build system prompt with context
    system_prompt = PROMPTS[req.module]
    if context_data:
        context_block = "\n\nCurrent Module Data:\n"
        for key, value in context_data.items():
            if key != "module":
                context_block += f"- {key}: {value}\n"
        system_prompt += context_block

    messages = [{"role": "system", "content": system_prompt}] + history

    # Call LLM
    try:
        provider = get_provider()
        response_text = await provider.chat(messages)
    except ValueError as e:
        # Log failed interaction
        await crud.log_interaction(
            db, user_id=user_id, organization_id=org_id, session_id=session_id,
            module=req.module, action="chat", input_tokens=input_tokens,
            success=False, error_message=str(e), user_message_preview=req.message,
        )
        raise ServiceUnavailableException(f"AI provider not configured: {str(e)}")
    except NotImplementedError as e:
        await crud.log_interaction(
            db, user_id=user_id, organization_id=org_id, session_id=session_id,
            module=req.module, action="chat", input_tokens=input_tokens,
            success=False, error_message=str(e), user_message_preview=req.message,
        )
        raise ServiceUnavailableException(str(e))
    except Exception as e:
        logger.error("LLM error: %s", str(e))
        await crud.log_interaction(
            db, user_id=user_id, organization_id=org_id, session_id=session_id,
            module=req.module, action="chat", input_tokens=input_tokens,
            success=False, error_message=str(e), user_message_preview=req.message,
        )
        raise ServiceUnavailableException("AI service temporarily unavailable")

    # Save assistant message
    output_tokens = crud.estimate_tokens(response_text)
    assistant_msg = await crud.add_message(db, session_id, "assistant", response_text, output_tokens)

    elapsed_ms = int((time.time() - start_time) * 1000)

    # Audit log
    await crud.log_interaction(
        db, user_id=user_id, organization_id=org_id, session_id=session_id,
        module=req.module, action="chat",
        input_tokens=input_tokens, output_tokens=output_tokens,
        response_time_ms=elapsed_ms, success=True,
        user_message_preview=req.message,
    )

    return ChatResponse(
        session_id=session_id,
        message=MessageResponse(
            id=assistant_msg.id,
            role=assistant_msg.role,
            content=assistant_msg.content,
            created_at=assistant_msg.created_at,
        ),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        response_time_ms=elapsed_ms,
    )


# ── Streaming Chat ──────────────────────────────────────────────────

@router.post("/chat/stream")
async def chat_stream(
    req: ChatRequest,
    request: Request,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get an AI response via Server-Sent Events (SSE).
    
    SSE Format:
        event: metadata
        data: {"session_id": "...", "message_id": "..."}
        
        event: content
        data: {"content": "chunk of text"}
        
        event: done
        data: {"usage": {"input_tokens": N, "output_tokens": N}, "response_time_ms": N}
    """
    # Rate limit
    user_id = user["user_id"]
    allowed, headers = rate_limiter.is_allowed(user_id)
    if not allowed:
        raise TooManyRequestsException(
            f"Rate limit exceeded. Max {settings.AI_RATE_LIMIT} requests per minute."
        )

    # Validate module
    if req.module not in PROMPTS:
        raise ValidationException(f"Invalid module: {req.module}. Supported: {', '.join(PROMPTS.keys())}")

    if len(req.message) > settings.MAX_INPUT_LENGTH:
        raise ValidationException(f"Message too long (max {settings.MAX_INPUT_LENGTH} chars)")

    _check_module_permission(user, req.module)

    org_id = user.get("organization_id", 0)
    start_time = time.time()

    # Get or create session
    if req.session_id:
        session = await crud.get_session(db, req.session_id, user_id)
        if not session:
            raise NotFoundException("Session not found")
        session_id = session.id
    else:
        title = req.message[:60].strip()
        if len(req.message) > 60:
            title += "..."
        session = await crud.create_session(db, user_id, org_id, req.module, title)
        session_id = session.id

    # Save user message
    input_tokens = crud.estimate_tokens(req.message)
    user_msg = await crud.add_message(db, session_id, "user", req.message, input_tokens)

    # Build context
    raw_token = user.get("_raw_token", "")
    context_provider = get_context_provider(req.module)
    context_data = await context_provider.get_context(user_id, raw_token)

    # Build conversation memory
    history = await crud.get_context_window(
        db, session_id,
        max_messages=settings.CONTEXT_WINDOW_MESSAGES,
        token_budget=settings.CONTEXT_TOKEN_BUDGET,
    )

    # Build system prompt
    system_prompt = PROMPTS[req.module]
    if context_data:
        context_block = "\n\nCurrent Module Data:\n"
        for key, value in context_data.items():
            if key != "module":
                context_block += f"- {key}: {value}\n"
        system_prompt += context_block

    messages = [{"role": "system", "content": system_prompt}] + history

    async def event_generator():
        full_response = ""
        message_id = f"msg-{int(time.time() * 1000)}"
        output_tokens = 0

        # Send metadata event
        yield f"event: metadata\ndata: {json.dumps({'session_id': session_id, 'message_id': message_id})}\n\n"

        try:
            provider = get_provider()
            async for chunk in provider.chat_stream(messages):
                full_response += chunk
                output_tokens = crud.estimate_tokens(full_response)
                yield f"event: content\ndata: {json.dumps({'content': chunk})}\n\n"

        except Exception as e:
            logger.error("Streaming LLM error: %s", str(e))
            yield f"event: error\ndata: {json.dumps({'error': 'AI service temporarily unavailable'})}\n\n"
            await crud.log_interaction(
                db, user_id=user_id, organization_id=org_id, session_id=session_id,
                module=req.module, action="stream",
                input_tokens=input_tokens, success=False,
                error_message=str(e), user_message_preview=req.message,
            )
            return

        # Save the complete response
        if full_response:
            await crud.add_message(db, session_id, "assistant", full_response, output_tokens)

        elapsed_ms = int((time.time() - start_time) * 1000)

        # Audit log
        await crud.log_interaction(
            db, user_id=user_id, organization_id=org_id, session_id=session_id,
            module=req.module, action="stream",
            input_tokens=input_tokens, output_tokens=output_tokens,
            response_time_ms=elapsed_ms, success=True,
            user_message_preview=req.message,
        )

        # Send done event
        done_data = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "response_time_ms": elapsed_ms,
        }
        yield f"event: done\ndata: {json.dumps(done_data)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Session Endpoints ───────────────────────────────────────────────

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
        raise NotFoundException("Session not found")

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


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def rename_session(
    session_id: str,
    body: SessionUpdate,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Rename a session title."""
    session = await crud.update_session_title(db, session_id, user["user_id"], body.title)
    if not session:
        raise NotFoundException("Session not found")
    return SessionResponse(
        id=session.id,
        title=session.title,
        module=session.module,
        message_count=len(session.messages),
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a session and all its messages."""
    session = await crud.get_session(db, session_id, user["user_id"])
    if not session:
        raise NotFoundException("Session not found")

    module_name = session.module
    await crud.delete_session(db, session_id, user["user_id"])

    # Audit log (session_id=None because session is deleted)
    await crud.log_interaction(
        db,
        user_id=user["user_id"],
        organization_id=user.get("organization_id", 0),
        session_id=None,
        module=module_name,
        action="delete_session",
        success=True,
    )

    return {"detail": "Session deleted", "id": session_id}


@router.delete("/sessions", response_model=ClearSessionsResponse)
async def clear_sessions(
    module: str | None = None,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Bulk delete all sessions for the current user, optionally scoped to a module."""
    count = await crud.clear_all_sessions(db, user["user_id"], module)
    await crud.log_interaction(
        db,
        user_id=user["user_id"],
        organization_id=user.get("organization_id", 0),
        session_id=None,
        module=module or "all",
        action="clear_all_sessions",
        success=True,
    )
    return ClearSessionsResponse(deleted_count=count)


# ── Suggestions ─────────────────────────────────────────────────────

@router.get("/suggestions/{module}", response_model=SuggestionResponse)
async def get_suggestions(
    module: str,
    user: dict = Depends(get_current_user_id),
):
    """Get static module-specific suggestion prompts."""
    if module not in MODULE_SUGGESTIONS:
        raise ValidationException(f"Invalid module: {module}. Supported: {', '.join(MODULE_SUGGESTIONS.keys())}")
    return SuggestionResponse(
        module=module,
        suggestions=MODULE_SUGGESTIONS[module],
    )


@router.get("/suggestions/{module}/dynamic", response_model=DynamicSuggestionsResponse)
async def get_dynamic_suggestions(
    module: str,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get context-aware dynamic suggestion chips based on live data."""
    if module not in PROMPTS:
        raise ValidationException(f"Invalid module: {module}")

    _check_module_permission(user, module)

    raw_token = user.get("_raw_token", "")
    context_provider = get_context_provider(module)
    context_data = await context_provider.get_context(user["user_id"], raw_token)

    # Build context summary for the UI
    context_summary = None
    if context_data:
        summary_parts = []
        for key, value in context_data.items():
            if key != "module" and isinstance(value, (int, float)):
                summary_parts.append(f"{key}: {value}")
        context_summary = ", ".join(summary_parts[:4]) if summary_parts else None

    suggestions = build_dynamic_suggestions(module, context_data)

    return DynamicSuggestionsResponse(
        module=module,
        suggestions=[
            DynamicSuggestion(text=s["text"], icon=s.get("icon"), category=s.get("category"))
            for s in suggestions
        ],
        context_summary=context_summary,
    )


# ── Analytics ───────────────────────────────────────────────────────

@router.get("/analytics/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated AI usage analytics for the current user."""
    data = await crud.get_analytics_overview(db, user["user_id"])
    return AnalyticsOverview(**data)


@router.get("/analytics/{module}", response_model=AnalyticsModule)
async def get_module_analytics(
    module: str,
    user: dict = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get analytics for a specific module."""
    if module not in PROMPTS:
        raise ValidationException(f"Invalid module: {module}")

    _check_module_permission(user, module)
    data = await crud.get_module_analytics(db, user["user_id"], module)
    return AnalyticsModule(**data)


# ── Health ──────────────────────────────────────────────────────────

@router.get("/health")
async def ai_health():
    """Check AI service health including LLM provider."""
    provider = get_provider()
    llm_ok = await provider.health_check()
    return {
        "status": "healthy" if llm_ok else "degraded",
        "llm_provider": settings.AI_PROVIDER,
        "llm_available": llm_ok,
    }
