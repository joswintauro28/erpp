from datetime import datetime

from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str | None = None
    barcode: str | None = None
    category: str | None = None
    description: str | None = None
    unit: str = "pcs"
    price: float = 0.0
    cost_price: float = 0.0
    tax_rate: float = 0.0
    track_inventory: bool = True
    low_stock_threshold: int = 10
    uses_batch_tracking: bool = False
    uses_serial_tracking: bool = False
    costing_method: str = "fifo"


class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    barcode: str | None = None
    category: str | None = None
    description: str | None = None
    unit: str | None = None
    price: float | None = None
    cost_price: float | None = None
    tax_rate: float | None = None
    track_inventory: bool | None = None
    low_stock_threshold: int | None = None
    uses_batch_tracking: bool | None = None
    uses_serial_tracking: bool | None = None
    costing_method: str | None = None
    is_active: bool | None = None


class ProductOut(BaseModel):
    id: int
    owner_id: int
    name: str
    sku: str | None
    barcode: str | None
    category: str | None
    description: str | None
    unit: str
    price: float
    cost_price: float
    tax_rate: float
    track_inventory: bool
    low_stock_threshold: int
    uses_batch_tracking: bool
    uses_serial_tracking: bool
    costing_method: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
