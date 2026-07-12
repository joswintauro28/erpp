from datetime import datetime

from pydantic import BaseModel


class SupplierCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    gst_number: str | None = None
    contact_person: str | None = None
    payment_terms: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    gst_number: str | None = None
    contact_person: str | None = None
    payment_terms: str | None = None
    is_active: bool | None = None


class SupplierOut(BaseModel):
    id: int
    organization_id: int
    name: str
    email: str | None
    phone: str | None
    address: str | None
    city: str | None
    state: str | None
    gst_number: str | None
    contact_person: str | None
    payment_terms: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
