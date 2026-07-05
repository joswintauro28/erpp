from datetime import datetime

from pydantic import BaseModel


class LeadCreate(BaseModel):
    company_name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    lead_score: int = 0
    assigned_to: str | None = None
    source: str = "Website"
    expected_value: float = 0.00
    status: str = "New"
    gst_number: str | None = None
    state: str | None = None
    address: str | None = None
    website: str | None = None
    industry: str | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    company_name: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    lead_score: int | None = None
    assigned_to: str | None = None
    source: str | None = None
    expected_value: float | None = None
    status: str | None = None
    gst_number: str | None = None
    state: str | None = None
    address: str | None = None
    website: str | None = None
    industry: str | None = None
    notes: str | None = None


class LeadOut(BaseModel):
    id: int
    owner_id: int
    company_name: str
    contact_person: str | None
    email: str | None
    phone: str | None
    lead_score: int
    assigned_to: str | None
    source: str
    expected_value: float
    status: str
    gst_number: str | None
    state: str | None
    address: str | None
    website: str | None
    industry: str | None
    notes: str | None
    converted_client_id: int | None
    converted_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
