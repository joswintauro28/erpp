from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app import database
from app.documents import schemas, crud

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("", response_model=schemas.DocumentManagementData)
async def get_documents_data(db: AsyncSession = Depends(database.get_db)):
    documents = await crud.get_documents(db)

    total = len(documents)
    open_count = len([d for d in documents if d.status in ['Draft', 'Under Review']])
    at_risk = len([d for d in documents if d.status == 'Expired'])
    owners_count = len(set(d.owner for d in documents if d.owner)) or 1

    summary = {
        "total_documents": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "documents": documents
    }
