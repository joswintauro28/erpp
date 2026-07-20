from pydantic import BaseModel
from typing import List
from app.core.schemas import GenericSummary

class ReportBase(BaseModel):
    id_str: str
    title: str
    category: str
    last_run: str
    status: str
    owner: str

class Report(ReportBase):
    id: int
    class Config:
        from_attributes = True

class ReportManagementData(BaseModel):
    summary: GenericSummary
    reports: List[Report]
