from pydantic import BaseModel
from typing import List, Optional

class OpportunityBase(BaseModel):
    id_str: Optional[str] = None
    name: Optional[str] = None
    account: Optional[str] = None
    value: Optional[str] = None
    probability: Optional[str] = None
    close_date: Optional[str] = None
    stage: Optional[str] = None
    owner: Optional[str] = None
    updated_at: Optional[str] = None

class Opportunity(OpportunityBase):
    id: int
    class Config:
        from_attributes = True

class OpportunitySummary(BaseModel):
    total_opportunities: int
    open: int
    overdue_at_risk: int
    owners: int

class OpportunityManagementData(BaseModel):
    summary: OpportunitySummary
    opportunities: List[Opportunity]
