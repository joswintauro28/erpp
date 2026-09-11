from datetime import datetime
from pydantic import BaseModel, Field


# ── Request Models ────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    session_id: str | None = Field(None, description="Existing session ID, or null for new session")
    module: str = Field("admin", description="Module context: admin, crm, billing, inventory")
    stream: bool = Field(False, description="Request SSE streaming response")


class SessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ClearSessionsResponse(BaseModel):
    deleted_count: int
    detail: str = "Sessions cleared successfully"


# ── Response Models ───────────────────────────

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    session_id: str
    message: MessageResponse
    # Token usage for analytics
    input_tokens: int = 0
    output_tokens: int = 0
    response_time_ms: int = 0


class SessionResponse(BaseModel):
    id: str
    title: str
    module: str
    message_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    session_id: str
    messages: list[MessageResponse]


class SuggestionResponse(BaseModel):
    module: str
    suggestions: list[str]


class DynamicSuggestion(BaseModel):
    text: str
    icon: str | None = None
    category: str | None = None  # "follow_up" | "action" | "insight"


class DynamicSuggestionsResponse(BaseModel):
    module: str
    suggestions: list[DynamicSuggestion]
    context_summary: str | None = None


class StreamChunk(BaseModel):
    """A single SSE chunk in the streaming response."""
    type: str  # "metadata" | "content" | "done" | "error"
    session_id: str | None = None
    content: str | None = None
    message_id: str | None = None
    usage: dict | None = None  # {"input_tokens": N, "output_tokens": N}


# ── Analytics ─────────────────────────────────

class AnalyticsOverview(BaseModel):
    total_messages: int
    total_sessions: int
    total_tokens_used: int
    avg_response_time_ms: int
    messages_today: int
    sessions_today: int
    module_usage: dict  # {"crm": 42, "billing": 18, ...}
    daily_message_counts: list[dict]  # [{"date": "2026-08-29", "count": 12}, ...]


class AnalyticsModule(BaseModel):
    module: str
    total_messages: int
    total_sessions: int
    total_tokens: int
    avg_response_time_ms: int
    success_rate: float
    top_queries: list[str]
