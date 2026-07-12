from pydantic import BaseModel
from typing import List


class LeadBase(BaseModel):
    id_str: str
    name: str
    company: str
    source: str
    est_value: int
    status: str
    organization_id: int
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


class OpportunityBase(BaseModel):
    id_str: str
    name: str
    account: str
    value: str
    probability: str
    close_date: str
    stage: str
    organization_id: int


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
