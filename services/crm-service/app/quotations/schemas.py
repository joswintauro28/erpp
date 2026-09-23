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
    file_uri: Optional[str] = None
    converted_invoice_id: Optional[int] = None
    created_at: Optional[str] = None
    owner: Optional[str] = None
    items: List[QuotationItemOut] = []

    # CPQ internal-approval overlay (S5/S6)
    approval_status: Optional[str] = None
    approval_required: Optional[bool] = False
    discount_pct: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    approval_threshold: Optional[float] = 15.0
    approved_by: Optional[str] = None
    decided_at: Optional[str] = None


class QuotationSummary(BaseModel):
    total_quotations: int
    open: int
    overdue_at_risk: int
    owners: int


class QuotationListResponse(BaseModel):
    summary: QuotationSummary
    quotations: List[QuotationOut]
