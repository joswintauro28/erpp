from pydantic import BaseModel
from typing import List, Optional

class LeadBase(BaseModel):
    id_str: Optional[str] = None
    name: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    est_value: Optional[int] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    updated_at: Optional[str] = None

class Lead(LeadBase):
    id: int
    class Config:
        from_attributes = True

class LeadSummary(BaseModel):
    total_leads: int
    open: int
    overdue_at_risk: int
    owners: int

class LeadManagementData(BaseModel):
    summary: LeadSummary
    leads: List[Lead]
