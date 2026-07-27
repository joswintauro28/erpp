from pydantic import BaseModel
from typing import List, Optional


class QuotationItemOut(BaseModel):
    description: str
    quantity: float
    unit_price: float
    gst_rate: float
    amount: float


class QuotationOut(BaseModel):
    id: int
    quote_number: str
    client_id: int
    client_name: str
    total: float
    status: str
    issue_date: str
    valid_until: str
    notes: str
    account: Optional[str] = None
    file_data: Optional[str] = None
    file_name: Optional[str] = None
    converted_invoice_id: Optional[int] = None
    created_at: Optional[str] = None
    items: List[QuotationItemOut] = []


class QuotationSummary(BaseModel):
    total_quotations: int
    open: int
    overdue_at_risk: int
    owners: int


class QuotationListResponse(BaseModel):
    summary: QuotationSummary
    quotations: List[QuotationOut]
