from pydantic import BaseModel
from typing import List

class LeadBase(BaseModel):
    id_str: str
    name: str
    company: str
    source: str
    est_value: int
    status: str
    owner: str
    updated_at: str

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
