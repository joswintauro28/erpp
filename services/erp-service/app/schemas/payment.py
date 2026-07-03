from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class Payment(BaseModel):
    invoice_id: int
    amount: float = Field(gt=0)
    payment_method: str = Field(min_length=1)
    payment_date: Optional[date] = None
    reference_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentLinkCreate(BaseModel):
    invoice_id: int
    amount: Optional[float] = Field(default=None, gt=0)
    callback_url: Optional[str] = None


class PaymentRefundCreate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
