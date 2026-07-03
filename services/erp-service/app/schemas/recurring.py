from datetime import date
from typing import Optional, Literal
from pydantic import BaseModel, Field

Frequency = Literal["weekly", "monthly", "quarterly", "yearly"]

class RecurringInvoiceCreate(BaseModel):
    invoice_id: int
    frequency: Frequency
    start_date: date
    end_date: Optional[date] = None
    auto_email: bool = False

class RecurringInvoiceUpdate(BaseModel):
    frequency: Optional[Frequency] = None
    end_date: Optional[date] = None
    auto_email: Optional[bool] = None
