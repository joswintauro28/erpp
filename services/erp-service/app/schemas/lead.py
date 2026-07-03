from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field

LeadStatus = Literal["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]


class Lead(BaseModel):
    company_name: str = Field(min_length=1)
    contact_person: str = Field(min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    status: LeadStatus = "New"
    lead_score: int = Field(default=0, ge=0, le=100)
    assigned_to: Optional[str] = None
    source: Optional[str] = None
    expected_value: float = Field(default=0, ge=0)
    notes: Optional[str] = None
    gst_number: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None


class LeadConvert(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    state: Optional[str] = None
