from datetime import date, datetime

from pydantic import BaseModel


class InvoiceItemCreate(BaseModel):
    product_id: int | None = None
    description: str
    quantity: float
    unit_price: float
    gst_rate: float = 0.0


class InvoiceItemOut(BaseModel):
    id: int
    invoice_id: int
    product_id: int | None
    description: str
    quantity: float
    unit_price: float
    gst_rate: float
    amount: float

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    client_id: int
    invoice_number: str | None = None
    status: str = "draft"
    issue_date: date | None = None
    due_date: date | None = None
    gst_treatment: str = "intrastate"
    place_of_supply: str | None = None
    notes: str | None = None
    items: list[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    status: str | None = None


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str | None = None
    payment_date: date | None = None
    reference_id: str | None = None
    notes: str | None = None


class PaymentOut(BaseModel):
    id: int
    owner_id: int
    invoice_id: int | None
    amount: float
    payment_method: str | None
    payment_date: date | None
    reference_id: str | None
    notes: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    owner_id: int
    client_id: int
    invoice_number: str | None
    status: str
    issue_date: date | None
    due_date: date | None
    subtotal: float
    cgst: float
    sgst: float
    igst: float
    tax_total: float
    total: float
    paid_amount: float
    balance_due: float
    gst_treatment: str
    place_of_supply: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    items: list[InvoiceItemOut] = []
    payments: list[PaymentOut] = []

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_clients: int
    total_invoices: int
    total_revenue: float
    outstanding_revenue: float
    overdue_amount: float
    total_products: int
    low_stock_count: int
