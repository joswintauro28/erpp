from pydantic import BaseModel
from typing import List, Optional

class DocumentBase(BaseModel):
    id_str: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    account: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    updated_at: Optional[str] = None
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
