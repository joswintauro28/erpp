from pydantic import BaseModel
from typing import Optional
from datetime import date

class Expense(BaseModel):
    expense_number: Optional[str] = None
    vendor: str
    category: str
    amount: float
    status: str = "paid"
    payment_method: Optional[str] = None
    expense_date: Optional[date] = None
    notes: Optional[str] = None