from datetime import datetime

from pydantic import BaseModel


class SerialNumberCreate(BaseModel):
    product_id: int
    warehouse_id: int
    serial_number: str
    purchase_order_id: int | None = None


class SerialNumberUpdate(BaseModel):
    status: str | None = None
    warehouse_id: int | None = None


class SerialNumberOut(BaseModel):
    id: int
    owner_id: int
    product_id: int
    warehouse_id: int
    serial_number: str
    status: str
    purchase_order_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
