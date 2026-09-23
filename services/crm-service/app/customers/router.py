from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app import database
from app.customers import schemas, crud
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("", response_model=schemas.CustomerManagementData)
async def get_customers_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    role = payload.get("role")
    is_owner = role in ["Organization Owner", "Admin"]
    customers = await crud.get_customers(db, owner_id=owner_id, is_admin=is_owner)

    total = len(customers)
    open_count = len([c for c in customers if c.status in ['Active', 'Prospect']])
    at_risk = len([c for c in customers if c.status in ['Dormant', 'Churned']])
    owners_count = len(set(c.owner for c in customers))

    summary = {
        "total_customers": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }

    return {
        "summary": summary,
        "customers": customers
    }
