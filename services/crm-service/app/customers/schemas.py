from pydantic import BaseModel
from typing import List, Optional

class CustomerBase(BaseModel):
    id_str: Optional[str] = None
    account: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[str] = None
    arr: Optional[int] = 0
    credit_limit: Optional[float] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    updated_at: Optional[str] = "Just now"

class Customer(CustomerBase):
    id: int
    class Config:
        from_attributes = True

class CustomerSummary(BaseModel):
    total_customers: int
    open: int
    overdue_at_risk: int
    owners: int

class CustomerManagementData(BaseModel):
    summary: CustomerSummary
    customers: List[Customer]
