from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class Client(BaseModel):
    name: str = Field(min_length=1)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    state: Optional[str] = None
    notes: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
