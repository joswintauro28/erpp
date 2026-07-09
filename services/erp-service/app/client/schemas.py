from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None
    state: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None
    state: str | None = None
    notes: str | None = None


class ClientOut(BaseModel):
    id: int
    owner_id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    gst_number: str | None
    state: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
