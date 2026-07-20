from pydantic import BaseModel
from typing import List, Optional

class DocumentBase(BaseModel):
    id_str: str
    name: str
    type: str
    account: str
    size: str
    status: str
    owner: str
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
