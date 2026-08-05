from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.idgen import SN_ID_RE


SERIAL_STATUSES = (
    "in_stock", "reserved", "sold", "returned", "repair", "damaged", "retired", "in_transit",
)


class SerialNumberCreate(BaseModel):
    product_id: int
    warehouse_id: int
    serial_number: str | None = Field(default=None, pattern=SN_ID_RE, description="Auto-generated as SN-[SKU]-[NNNN] when omitted")
    sku: str | None = None
    status: str = Field(default="in_stock", pattern="^(in_stock|reserved|sold|returned|repair|damaged|retired|in_transit)$")
    purchase_order_id: int | None = None
    warranty_until: datetime | None = None
    activated_at: datetime | None = None
    notes: str | None = None


class SerialNumberUpdate(BaseModel):
    product_id: int | None = None
    warehouse_id: int | None = None
    serial_number: str | None = Field(default=None, pattern=SN_ID_RE)
    sku: str | None = None
    status: str | None = Field(default=None, pattern="^(in_stock|reserved|sold|returned|repair|damaged|retired|in_transit)$")
    purchase_order_id: int | None = None
    sales_order_code: str | None = None
    warranty_until: datetime | None = None
    activated_at: datetime | None = None
    sold_at: datetime | None = None
    notes: str | None = None


class SerialNumberOut(BaseModel):
    id: int
    organization_id: int
    product_id: int
    product_name: str | None = None
    sku: str | None
    warehouse_id: int
    warehouse_name: str | None = None
    serial_number: str
    status: str
    purchase_order_id: int | None
    sales_order_code: str | None
    warranty_until: datetime | None
    activated_at: datetime | None
    sold_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SerialNumberStats(BaseModel):
    total: int
    in_stock: int
    reserved: int
    sold: int
    returned: int
    repair: int
    damaged: int
    retired: int
    in_transit: int
