from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

QuotationStatus = Literal["draft", "sent", "accepted", "rejected", "expired"]
GstTreatment = Literal["intrastate", "interstate"]

class QuotationItem(BaseModel):
    product_id: Optional[int] = None
    description: str = Field(min_length=1)
    quantity: float = Field(default=1, gt=0)
    unit_price: float = Field(default=0, ge=0)
    gst_rate: float = Field(default=18, ge=0, le=100)

class Quotation(BaseModel):
    client_id: int
    lead_id: Optional[int] = None
    issue_date: Optional[date] = None
    valid_until: Optional[date] = None
    status: Optional[QuotationStatus] = "draft"
    notes: Optional[str] = None
    gst_treatment: GstTreatment = "intrastate"
    items: List[QuotationItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_items(self):
        if not self.items:
            raise ValueError("At least one quotation item is required")
        return self

class QuotationUpdate(BaseModel):
    status: QuotationStatus

class QuotationEmailRequest(BaseModel):
    to_email: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None