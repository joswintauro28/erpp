from pydantic import BaseModel
from typing import List, Optional

class SalesOrderBase(BaseModel):
    id_str: Optional[str] = None
    so_no: Optional[str] = None
    account: Optional[str] = None
    from_quote: Optional[str] = None
    value: Optional[str] = None
    eta: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    file_uri: Optional[str] = None
    file_id: Optional[int] = None
    line_items: Optional[List[dict]] = None
    # O2/O3 credit check + internal approval state
    credit_check_status: Optional[str] = "Not Checked"
    credit_check_detail: Optional[dict] = None
    approval_status: Optional[str] = "Pending"
    approved_at: Optional[str] = None

class SalesOrder(SalesOrderBase):
    id: int
    class Config:
        from_attributes = True

class SalesOrderSummary(BaseModel):
    total_orders: int
    total_sales_orders: Optional[int] = None
    open: int
    overdue_at_risk: int
    owners: int

class SalesOrderManagementData(BaseModel):
    summary: SalesOrderSummary
    sales_orders: List[SalesOrder]
