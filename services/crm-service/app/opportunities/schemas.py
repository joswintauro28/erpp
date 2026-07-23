from pydantic import BaseModel
from typing import List, Optional

class OpportunityBase(BaseModel):
    id_str: str
    name: str
    account: str
    value: str
    probability: str
    close_date: str
    stage: str
    owner: str
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
