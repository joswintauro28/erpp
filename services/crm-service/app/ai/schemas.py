from pydantic import BaseModel
from typing import List


class Summary(BaseModel):
    total: int
    open: int
    overdue_at_risk: int
    owners: int


class AIAssistantLogBase(BaseModel):
    id_str: str
    query: str
    category: str
    date: str
    status: str
    organization_id: int


class AIAssistantLog(AIAssistantLogBase):
    id: int
    class Config:
        from_attributes = True


class AIAssistantManagementData(BaseModel):
    summary: Summary
    ai_logs: List[AIAssistantLog]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
