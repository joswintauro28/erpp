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
    organization_id: int
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


class CostLayerSnapshot(BaseModel):
    batch_id: int | None = None
    serial_number: str | None = None
    quantity: float
    unit_cost: float
    layer_timestamp: str | None = None


class CostSnapshotContract(BaseModel):
    product_id: int
    sku: str | None = None
    product_name: str
    quantity: float = 1.0
    unit_cost: float
    total_cost: float
    currency: str = "USD"
    costing_method: str = "fifo"
    warehouse_id: int | None = None
    warehouse_name: str | None = None
    batch_number: str | None = None
    serial_number: str | None = None
    inventory_transaction_id: int | None = None
    cost_calculation_timestamp: str
    cost_version: str = "v1.0"
    inventory_movement_reference: str | None = None
    cost_layers: list[CostLayerSnapshot] = []
    snapshot_hash: str | None = None
    signature: str | None = None


class ProductCostOut(BaseModel):
    product_id: int
    sku: str | None = None
    product_name: str
    unit_cost: float
    costing_method: str
    source: str = "inventory-service"
    snapshot: CostSnapshotContract | None = None


class BatchCostItemRequest(BaseModel):
    product_id: int
    quantity: float = 1.0
    warehouse_id: int | None = None
    batch_number: str | None = None
    serial_number: str | None = None


class BatchCostRequest(BaseModel):
    items: list[BatchCostItemRequest]


class BatchCostItemResponse(BaseModel):
    product_id: int
    sku: str | None = None
    product_name: str
    quantity: float
    unit_cost: float
    total_cost: float
    costing_method: str
    warehouse_id: int | None = None
    batch_number: str | None = None
    serial_number: str | None = None
    snapshot: CostSnapshotContract


class BatchCostResponse(BaseModel):
    costs: list[BatchCostItemResponse]
    currency: str = "USD"
    resolved_at: str

