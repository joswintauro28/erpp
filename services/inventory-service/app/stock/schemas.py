from datetime import datetime

from pydantic import BaseModel


class StockOut(BaseModel):
    id: int
    organization_id: int
    product_id: int
    warehouse_id: int
    quantity: int
    reserved_quantity: int
    product_name: str | None = None
    sku: str | None = None
    warehouse_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StockMovementCreate(BaseModel):
    product_id: int
    warehouse_id: int
    type: str
    quantity: int
    reference_type: str | None = None
    reference_id: int | None = None
    notes: str | None = None


class StockMovementOut(BaseModel):
    id: int
    organization_id: int
    product_id: int
    warehouse_id: int
    type: str
    quantity: int
    reference_type: str | None
    reference_id: int | None
    notes: str | None
    product_name: str | None = None
    sku: str | None = None
    warehouse_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StockAdjustment(BaseModel):
    product_id: int
    warehouse_id: int
    new_quantity: int
    notes: str | None = None


class StockCheckRequestItem(BaseModel):
    product_id: int | None = None
    sku: str | None = None
    quantity: int = 1


class StockCheckRequest(BaseModel):
    warehouse_id: int | None = None
    items: list[StockCheckRequestItem]


class StockCheckItemResult(BaseModel):
    product_id: int
    product_name: str | None = None
    sku: str | None = None
    requested_quantity: int
    available_quantity: int
    is_available: bool


class StockCheckResponse(BaseModel):
    overall_available: bool
    warehouse_id: int | None
    items: list[StockCheckItemResult]
