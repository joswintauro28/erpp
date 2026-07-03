from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class CreditNoteItemCreate(BaseModel):
    invoice_item_id: int
    returned_quantity: float = Field(gt=0)

class CreditNoteCreate(BaseModel):
    invoice_id: int
    reason: str
    restock_items: bool = False
    items: Optional[list[CreditNoteItemCreate]] = None

class CreditNoteOut(BaseModel):
    id: int
    owner_id: int
    invoice_id: int
    credit_note_number: str
    amount: float
    reason: str
    restock_items: bool
    status: str
    issue_date: date

class DebitNoteCreate(BaseModel):
    invoice_id: int
    amount: float = Field(gt=0)
    reason: str

class DebitNoteOut(BaseModel):
    id: int
    owner_id: int
    invoice_id: int
    debit_note_number: str
    amount: float
    reason: str
    status: str
    issue_date: date
