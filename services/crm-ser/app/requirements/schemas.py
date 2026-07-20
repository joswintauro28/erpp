from pydantic import BaseModel
from typing import List

class RequirementBase(BaseModel):
    id_str: str
    name: str
    account: str
    category: str
    priority: str
    status: str
    owner: str

class Requirement(RequirementBase):
    id: int
    class Config:
        from_attributes = True

class RequirementSummary(BaseModel):
    total_requirements: int
    open: int
    overdue_at_risk: int
    owners: int

class RequirementManagementData(BaseModel):
    summary: RequirementSummary
    requirements: List[Requirement]
