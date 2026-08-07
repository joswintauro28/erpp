from datetime import datetime
from pydantic import BaseModel, Field

# Ingestion-boundary pattern for codes arriving from other services. Canonical
# generated codes are SO-YYYYMM-NNNN, but legacy/manual codes such as
# "SO-20260001" must also be accepted — a strict reject here silently drops the
# order (the worker acks the message even on failure).
CODE_ACCEPT_RE = r"^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$"


class FulfillmentItemCreate(BaseModel):
    product_id: int | None = None
    product_name: str
    sku: str | None = None
    ordered_quantity: int
    unit_price: float = 0.0


class FulfillmentItemOut(BaseModel):
    id: int
    fulfillment_id: int
    product_id: int
    product_name: str
    sku: str | None = None
    ordered_quantity: int
    reserved_quantity: int
    picked_quantity: int
    packed_quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class FulfillmentCreate(BaseModel):
    sales_order_code: str = Field(pattern=CODE_ACCEPT_RE)
    customer_name: str
    sales_owner: str | None = None
    warehouse_id: int | None = None
    items: list[FulfillmentItemCreate]


class FulfillmentDispatchAction(BaseModel):
    shipping_carrier: str
    tracking_number: str


class ShippingLabelOut(BaseModel):
    fulfillment_id: int
    sales_order_code: str
    customer_name: str
    shipping_carrier: str | None = None
    tracking_number: str | None = None
    barcode_text: str
    items: list[dict]
    generated_at: str
    url: str


class StockCheckResultItem(BaseModel):
    product_id: int
    product_name: str
    ordered_quantity: int
    available_stock: int
    is_available: bool


class StockCheckResult(BaseModel):
    fulfillment_id: int
    overall_available: bool
    warehouse_id: int | None
    items: list[StockCheckResultItem]


class FulfillmentOut(BaseModel):
    id: int
    organization_id: int
    sales_order_code: str
    customer_name: str
    warehouse_id: int | None = None
    status: str
    shipping_carrier: str | None = None
    tracking_number: str | None = None
    dispatched_at: datetime | None = None
    batch_no: str | None = None
    work_order_id: int | None = None
    purchase_order_id: int | None = None
    invoice_id: int | None = None
    sales_owner: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[FulfillmentItemOut] = []

    model_config = {"from_attributes": True}


class PickingBatchCreate(BaseModel):
    """I7: create a picking wave/batch from a set of reserved fulfillments."""

    fulfillment_ids: list[int] = Field(min_length=1)


class PickingBatchItem(BaseModel):
    fulfillment_id: int
    sales_order_code: str
    customer_name: str
    warehouse_id: int | None = None


class PickingBatchOut(BaseModel):
    batch_no: str
    status: str
    created_at: str
    items: list[PickingBatchItem]
