from pydantic import BaseModel
from typing import List, Optional
from app.core.schemas import GenericSummary

class ReportBase(BaseModel):
    id_str: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    last_run: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None

class Report(ReportBase):
    id: int
    class Config:
        from_attributes = True

class ReportManagementData(BaseModel):
    summary: GenericSummary
    reports: List[Report]
