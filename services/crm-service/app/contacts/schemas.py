from pydantic import BaseModel
from typing import List

class ContactBase(BaseModel):
    id_str: str
    name: str
    role: str
    account: str
    email: str
    phone: str
    type: str
    last_contact: str

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
