from pydantic import BaseModel
from typing import List, Optional


class SaleBase(BaseModel):
    id_str: str
    invoice_no: str
    account: str
    amount: str
    issued_date: str
    due_date: str
    status: str
    rep: str


class Sale(SaleBase):
    id: int
    class Config:
        from_attributes = True


class SaleSummary(BaseModel):
    total_sales: int
    open: int
    overdue_at_risk: int
    owners: int


class SaleManagementData(BaseModel):
    summary: SaleSummary
    sales: List[Sale]


class RequirementBase(BaseModel):
    id_str: str
    name: str
    account: str
    category: str
    priority: str
    status: str
    owner_id: int


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


class QuotationBase(BaseModel):
    id_str: str
    quote_no: str
    account: str
    value: str
    valid_until: str
    status: str
    owner_id: int
    file_data: Optional[str] = None
    file_name: Optional[str] = None


class Quotation(QuotationBase):
    id: int
    class Config:
        from_attributes = True


class QuotationSummary(BaseModel):
    total_quotations: int
    open: int
    overdue_at_risk: int
    owners: int


class QuotationManagementData(BaseModel):
    summary: QuotationSummary
    quotations: List[Quotation]


class SalesOrderBase(BaseModel):
    id_str: str
    so_no: str
    account: str
    from_quote: str
    value: str
    eta: str
    status: str
    owner_id: int
    file_data: Optional[str] = None
    file_name: Optional[str] = None


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
