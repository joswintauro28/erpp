from pydantic import BaseModel
from typing import List, Optional

class RequirementBase(BaseModel):
    id_str: Optional[str] = None
    name: Optional[str] = None
    account: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None

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
