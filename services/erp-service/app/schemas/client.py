from datetime import datetime

from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None
    state: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None
    state: str | None = None
    notes: str | None = None


class ClientOut(BaseModel):
    id: int
    owner_id: int
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None
    state: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
