from pydantic import BaseModel
from typing import List, Optional


class CustomerBase(BaseModel):
    id_str: str
    account: str
    industry: str
    tier: str
    arr: int
    status: str
    owner_id: int
    updated_at: str


class Customer(CustomerBase):
    id: int
    class Config:
        from_attributes = True


class CustomerSummary(BaseModel):
    total_customers: int
    open: int
    overdue_at_risk: int
    owners: int


class CustomerManagementData(BaseModel):
    summary: CustomerSummary
    customers: List[Customer]


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


class DocumentBase(BaseModel):
    id_str: str
    name: str
    type: str
    account: str
    size: str
    status: str
    owner_id: int
    updated_at: str
    file_data: Optional[str] = None
    summary: Optional[str] = None
    files: Optional[str] = None


class Document(DocumentBase):
    id: int
    class Config:
        from_attributes = True


class DocumentSummary(BaseModel):
    total_documents: int
    open: int
    overdue_at_risk: int
    owners: int


class DocumentManagementData(BaseModel):
    summary: DocumentSummary
    documents: List[Document]
