from datetime import datetime

from pydantic import BaseModel, Field


class PurchaseRequisitionItemCreate(BaseModel):
    product_id: int | None = None
    product_name: str | None = None
    quantity: int = Field(gt=0)
    estimated_price: float = Field(default=0.0, ge=0)


class PurchaseRequisitionCreate(BaseModel):
    title: str
    requested_by: str | None = None
    department: str | None = None
    priority: str = "MEDIUM"
    need_by_date: datetime | None = None
    notes: str | None = None
    items: list[PurchaseRequisitionItemCreate] = Field(min_length=1)


class PurchaseRequisitionDecision(BaseModel):
    reason: str | None = None


class PurchaseRequisitionConvert(BaseModel):
    """P1 -> P2: destination supplier + warehouse for the generated Purchase Order."""

    supplier_id: int
    warehouse_id: int


class PurchaseRequisitionItemOut(BaseModel):
    id: int
    requisition_id: int
    product_id: int
    product_name: str
    quantity: int
    estimated_price: float

    model_config = {"from_attributes": True}


class PurchaseRequisitionOut(BaseModel):
    id: int
    organization_id: int
    pr_number: str
    title: str
    requested_by: str | None
    department: str | None
    priority: str
    need_by_date: datetime | None
    notes: str | None
    status: str
    approved_by: str | None
    approved_at: datetime | None
    rejected_reason: str | None
    purchase_order_id: int | None
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseRequisitionItemOut] = []

    model_config = {"from_attributes": True}
