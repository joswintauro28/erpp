from pydantic import BaseModel
from typing import List, Optional
from app.core.schemas import GenericSummary

class AIAssistantLogBase(BaseModel):
    id_str: Optional[str] = None
    query: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None

class AIAssistantLog(AIAssistantLogBase):
    id: int
    class Config:
        from_attributes = True

class AIAssistantManagementData(BaseModel):
    summary: GenericSummary
    ai_logs: List[AIAssistantLog]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
