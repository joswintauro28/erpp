from pydantic import BaseModel
from typing import List, Optional

class ContactBase(BaseModel):
    id_str: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    account: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[str] = None
    last_contact: Optional[str] = None

class Contact(ContactBase):
    id: int
    class Config:
        from_attributes = True

class ContactSummary(BaseModel):
    total_contacts: int
    open: int
    overdue_at_risk: int
    owners: int

class ContactManagementData(BaseModel):
    summary: ContactSummary
    contacts: List[Contact]
