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
    created_at: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    probability: Optional[str] = None
    # Scoring (M3) / MQL (M4) fields surfaced to the UI
    score: Optional[int] = 0
    tier: Optional[str] = "Cold"
    nurture_status: Optional[str] = "New"
    is_mql: Optional[bool] = False
    mql_qualified_at: Optional[str] = None

class Lead(LeadBase):
    id: int
    class Config:
        from_attributes = True

class LeadSummary(BaseModel):
    total_leads: int
    open: int
    overdue_at_risk: int
    owners: int
    mql: Optional[int] = 0
    sql: Optional[int] = 0

class LeadManagementData(BaseModel):
    summary: LeadSummary
    leads: List[Lead]
