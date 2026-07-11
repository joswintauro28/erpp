import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.sales.schemas import SaleManagementData, RequirementManagementData, QuotationManagementData, SalesOrderManagementData

router = APIRouter(prefix="/api", tags=["sales"])


@router.get("/sales", response_model=SaleManagementData)
async def get_sales_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Sale))
    sales = list(result.scalars().all())

    total = len(sales)
    open_count = len([s for s in sales if s.status in ['Draft', 'Invoiced', 'Confirmed']])
    at_risk = len([s for s in sales if s.status == 'Overdue'])
    owners_count = len(set(s.rep for s in sales if s.rep)) or 1

    summary = {
        "total_sales": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "sales": sales}


@router.get("/requirements", response_model=RequirementManagementData)
async def get_requirements_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Requirement).where(Requirement.owner_id == user_id))
    requirements = list(result.scalars().all())

    total = len(requirements)
    open_count = len([r for r in requirements if r.status in ['Draft', 'Review']])
    at_risk = len([r for r in requirements if r.status == 'Cancelled'])
    owners_count = len(set(r.owner_id for r in requirements if r.owner_id)) or 1

    summary = {
        "total_requirements": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "requirements": requirements}


@router.get("/quotations", response_model=QuotationManagementData)
async def get_quotations_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(Quotation).where(Quotation.owner_id == user_id))
    quotations = list(result.scalars().all())

    total = len(quotations)
    open_count = len([q for q in quotations if q.status in ['Draft', 'Sent', 'Under Review']])
    at_risk = len([q for q in quotations if q.status == 'Expired'])
    owners_count = len(set(q.owner_id for q in quotations if q.owner_id)) or 1

    summary = {
        "total_quotations": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "quotations": quotations}


@router.get("/sales-orders", response_model=SalesOrderManagementData)
async def get_sales_orders_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(sa.select(SalesOrder).where(SalesOrder.owner_id == user_id))
    sales_orders = list(result.scalars().all())

    total = len(sales_orders)
    open_count = len([so for so in sales_orders if so.status in ['Pending', 'Confirmed']])
    at_risk = len([so for so in sales_orders if so.status == 'Cancelled'])
    owners_count = len(set(so.owner_id for so in sales_orders if so.owner_id)) or 1

    summary = {
        "total_orders": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "sales_orders": sales_orders}
