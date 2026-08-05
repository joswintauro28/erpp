from datetime import datetime

from pydantic import BaseModel, Field


class PurchaseOrderItemCreate(BaseModel):
    product_id: int | None = None
    product_name: str | None = None
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class PurchaseOrderItemOut(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    quantity: int
    received_quantity: int = 0
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}


class PurchaseOrderItemReceipt(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    warehouse_id: int
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(min_length=1)


class PurchaseOrderUpdate(BaseModel):
    supplier_id: int | None = None
    warehouse_id: int | None = None
    status: str | None = Field(
        default=None,
        pattern="^(DRAFT|SUBMITTED|APPROVED|PARTIALLY_RECEIVED|COMPLETED|CANCELLED)$",
        description="Canonical PO lifecycle status",
    )
    notes: str | None = None
    expected_at: datetime | None = None
    received_items: list[PurchaseOrderItemReceipt] | None = None


class PurchaseOrderOut(BaseModel):
    id: int
    organization_id: int
    supplier_id: int
    warehouse_id: int
    order_number: str
    status: str
    notes: str | None
    subtotal: float
    tax_amount: float
    total: float
    ordered_at: datetime | None
    submitted_at: datetime | None
    approved_at: datetime | None
    expected_at: datetime | None
    received_at: datetime | None
    cancelled_at: datetime | None
    items: list[PurchaseOrderItemOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
