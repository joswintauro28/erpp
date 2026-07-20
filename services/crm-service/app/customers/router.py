from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app import database
from app.customers import schemas, crud

router = APIRouter(prefix="/api/customers", tags=["customers"])

@router.get("", response_model=schemas.CustomerManagementData)
async def get_customers_data(db: AsyncSession = Depends(database.get_db)):
    customers = await crud.get_customers(db)

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
