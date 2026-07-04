from datetime import date, datetime

from pydantic import BaseModel, field_validator


class InvoiceItemCreate(BaseModel):
    product_id: int | None = None
    description: str
    quantity: float
    unit_price: float
    gst_rate: float = 0.00


class InvoiceItemOut(BaseModel):
    id: int
    invoice_id: int
    product_id: int | None = None
    description: str
    quantity: float
    unit_price: float
    gst_rate: float
    amount: float

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: int
    due_date: date
    issue_date: date | None = None
    status: str = "draft"
    gst_treatment: str = "intrastate"
    place_of_supply: str | None = None
    notes: str | None = None
    items: list[InvoiceItemCreate]

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"draft", "pending", "paid", "overdue", "cancelled"}
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


class InvoiceUpdate(BaseModel):
    status: str | None = None


class InvoiceOut(BaseModel):
    id: int
    owner_id: int
    client_id: int
    invoice_number: str | None = None
    status: str
    issue_date: date | None = None
    due_date: date | None = None
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    tax_total: float
    total: float
    paid_amount: float
    balance_due: float
    gst_treatment: str
    place_of_supply: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemOut] = []

    model_config = {"from_attributes": True}


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str
    payment_date: date | None = None
    reference_id: str | None = None
    notes: str | None = None


class PaymentOut(BaseModel):
    id: int
    owner_id: int
    invoice_id: int | None = None
    amount: float
    payment_method: str | None = None
    payment_date: date | None = None
    reference_id: str | None = None
    notes: str | None = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_clients: int = 0
    total_invoices: int = 0
    total_revenue: float = 0.0
    outstanding_amount: float = 0.0
    overdue_invoices: int = 0
    total_products: int = 0
    low_stock_count: int = 0
    active_quotations: int = 0
    lead_conversion_rate: float = 0.0
