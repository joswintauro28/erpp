import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.customer.models import Customer, Contact, Document
from app.customer.schemas import CustomerManagementData, ContactManagementData, DocumentManagementData

router = APIRouter(prefix="/api", tags=["customer"])


@router.get("/customers", response_model=CustomerManagementData)
async def get_customers_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Customer).where(Customer.owner_id == user_id))
    customers = list(result.scalars().all())

    total = len(customers)
    open_count = len([c for c in customers if c.status in ['Active', 'Prospect']])
    at_risk = len([c for c in customers if c.status in ['Dormant', 'Churned']])
    owners_count = len(set(c.owner_id for c in customers if c.owner_id)) or 1

    summary = {
        "total_customers": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "customers": customers}


@router.get("/contacts", response_model=ContactManagementData)
async def get_contacts_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Contact).where(Contact.owner_id == user_id))
    contacts = list(result.scalars().all())

    total = len(contacts)
    open_count = len([c for c in contacts if c.type in ['Primary', 'Decision']])
    at_risk = len([c for c in contacts if c.type in ['Inactive']])
    owners_count = len(set(c.owner_id for c in contacts if c.owner_id)) or 1

    summary = {
        "total_contacts": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "contacts": contacts}


@router.get("/documents", response_model=DocumentManagementData)
async def get_documents_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Document).where(Document.owner_id == user_id))
    documents = list(result.scalars().all())

    total = len(documents)
    open_count = len([d for d in documents if d.status in ['Draft', 'Under Review']])
    at_risk = len([d for d in documents if d.status == 'Expired'])
    owners_count = len(set(d.owner_id for d in documents if d.owner_id)) or 1

    summary = {
        "total_documents": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "documents": documents}
