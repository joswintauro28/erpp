from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProductRef(BaseModel):
    id: int
    sku: str | None = None


class WarehouseRef(BaseModel):
    id: int


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
    product: ProductRef
    warehouse: WarehouseRef
    type: Literal["in", "out", "adjustment"]
    quantity: int = Field(gt=0)
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
    product: ProductRef
    warehouse: WarehouseRef
    new_quantity: int = Field(ge=0)
    notes: str | None = None


class StockCheckRequestItem(BaseModel):
    product_id: int | None = None
    sku: str | None = None
    quantity: int = Field(default=1, gt=0)


class StockCheckRequest(BaseModel):
    warehouse_id: int | None = None
    items: list[StockCheckRequestItem] = Field(min_length=1)


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
