from datetime import datetime

from pydantic import BaseModel


class WarehouseCreate(BaseModel):
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    is_active: bool | None = None


class WarehouseOut(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    address: str | None
    city: str | None
    state: str | None
    country: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
