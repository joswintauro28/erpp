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
    file_data: Optional[str] = None
    file_name: Optional[str] = None
    line_items: Optional[List[dict]] = None

class SalesOrder(SalesOrderBase):
    id: int
    class Config:
        from_attributes = True

class SalesOrderSummary(BaseModel):
    total_orders: int
    open: int
    overdue_at_risk: int
    owners: int

class SalesOrderManagementData(BaseModel):
    summary: SalesOrderSummary
    sales_orders: List[SalesOrder]
