from datetime import datetime

from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str | None = None
    category: str | None = None
    price: float = 0.00
    cost_price: float = 0.00
    stock: int = 0
    low_stock_threshold: int = 10
    track_inventory: bool = True
    uses_batch_tracking: bool = False
    uses_serial_tracking: bool = False
    costing_method: str = "standard"


class ProductUpdate(BaseModel):
    name: str | None = None
    sku: str | None = None
    category: str | None = None
    price: float | None = None
    cost_price: float | None = None
    stock: int | None = None
    low_stock_threshold: int | None = None
    track_inventory: bool | None = None
    uses_batch_tracking: bool | None = None
    uses_serial_tracking: bool | None = None
    costing_method: str | None = None


class ProductOut(BaseModel):
    id: int
    owner_id: int
    name: str
    sku: str | None = None
    category: str | None = None
    price: float
    cost_price: float
    stock: int
    low_stock_threshold: int
    track_inventory: bool
    uses_batch_tracking: bool
    uses_serial_tracking: bool
    costing_method: str
    created_at: datetime

    model_config = {"from_attributes": True}
