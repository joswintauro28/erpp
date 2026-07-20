from pydantic import BaseModel
from typing import List, Optional

class QuotationBase(BaseModel):
    id_str: str
    quote_no: str
    account: str
    value: str
    valid_until: str
    status: str
    owner: str
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
