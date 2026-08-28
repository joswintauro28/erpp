from datetime import datetime
from pydantic import BaseModel, Field


# ── Request Models ────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="User message")
    session_id: str | None = Field(None, description="Existing session ID, or null for new session")
    module: str = Field("admin", description="Module context: admin, crm, billing, inventory")


class SessionUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


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
