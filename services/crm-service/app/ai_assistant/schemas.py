from pydantic import BaseModel
from typing import List
from app.core.schemas import GenericSummary

class AIAssistantLogBase(BaseModel):
    id_str: str
    query: str
    category: str
    date: str
    status: str
    owner: str

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
