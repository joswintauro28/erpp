from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app import database
from app.contacts import schemas, crud
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("", response_model=schemas.ContactManagementData)
async def get_contacts_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    role = payload.get("role")
    is_owner = role in ["Organization Owner", "Admin"]
    contacts = await crud.get_contacts(db, owner_id=owner_id, is_admin=is_owner)

    total = len(contacts)
    open_count = len([c for c in contacts if c.type in ['Primary', 'Decision']])
    at_risk = len([c for c in contacts if c.type in ['Inactive']])
    owners_count = 5

    summary = {
        "total_contacts": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "contacts": contacts
    }
