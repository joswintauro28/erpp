from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator

InvoiceStatus = Literal["draft", "pending", "partially_paid", "paid", "overdue", "cancelled"]
GstTreatment = Literal["intrastate", "interstate"]


class BatchAllocation(BaseModel):
    batch_id: int
    quantity: float = Field(gt=0)


class InvoiceItem(BaseModel):
    product_id: Optional[int] = None
    description: str = Field(min_length=1)
    quantity: float = Field(default=1, gt=0)
    unit_price: float = Field(default=0, ge=0)
    gst_rate: float = Field(default=18, ge=0, le=100)
    # Optional manual serial selection (serial-tracked products)
    serial_ids: Optional[List[int]] = None
    # Optional manual batch allocation (batch-tracked products)
    batch_allocations: Optional[List[BatchAllocation]] = None


class Invoice(BaseModel):
    client_id: int
    amount: Optional[float] = Field(default=None, ge=0)
    due_date: date
    issue_date: Optional[date] = None
    status: Optional[InvoiceStatus] = "pending"
    gst_treatment: GstTreatment = "intrastate"
    place_of_supply: Optional[str] = None
    notes: Optional[str] = None
    warehouse_id: Optional[int] = None
    items: List[InvoiceItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_amount_or_items(self):
        if not self.items and self.amount is None:
            raise ValueError("Either amount or at least one invoice item is required")
        return self


class InvoiceUpdate(BaseModel):
    status: InvoiceStatus


class InvoiceEmailRequest(BaseModel):
    to_email: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
