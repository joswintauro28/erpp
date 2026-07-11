from datetime import datetime

from pydantic import BaseModel


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float


class PurchaseOrderItemOut(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    quantity: int
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    warehouse_id: int
    notes: str | None = None
    items: list[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    supplier_id: int | None = None
    warehouse_id: int | None = None
    status: str | None = None
    notes: str | None = None
    expected_at: datetime | None = None


class PurchaseOrderOut(BaseModel):
    id: int
    owner_id: int
    supplier_id: int
    warehouse_id: int
    order_number: str
    status: str
    notes: str | None
    subtotal: float
    tax_amount: float
    total: float
    ordered_at: datetime | None
    expected_at: datetime | None
    received_at: datetime | None
    items: list[PurchaseOrderItemOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
