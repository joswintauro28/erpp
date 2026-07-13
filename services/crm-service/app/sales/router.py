import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, get_current_token_payload
from app.core.billing_client import push_quotation_to_billing
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.sales.schemas import SaleManagementData, RequirementManagementData, QuotationManagementData, SalesOrderManagementData

router = APIRouter(prefix="/api", tags=["sales"])


@router.post("/quotations/{id_str}/push-to-billing")
async def push_quotation_to_billing_endpoint(
    id_str: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    result = await db.execute(sa.select(Quotation).where(Quotation.id_str == id_str))
    quotation = result.scalars().first()
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if quotation.billing_quote_id is not None:
        raise HTTPException(status_code=409, detail="Quotation already pushed to billing")

    q_dict = {
        "quote_no": quotation.quote_no,
        "account": quotation.account,
        "value": quotation.value,
        "valid_until": quotation.valid_until,
        "id_str": quotation.id_str,
    }

    billing_quote = await push_quotation_to_billing(token, q_dict)
    billing_id = billing_quote.get("id")

    quotation.billing_quote_id = billing_id
    await db.commit()
    await db.refresh(quotation)

    return {
        "status": "synced",
        "crm_quote_id": quotation.id,
        "billing_quote_id": billing_id,
    }


@router.get("/sales", response_model=SaleManagementData)
async def get_sales_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
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
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Requirement).where(Requirement.organization_id == user_id))
    requirements = list(result.scalars().all())

    total = len(requirements)
    open_count = len([r for r in requirements if r.status in ['Draft', 'Review']])
    at_risk = len([r for r in requirements if r.status == 'Cancelled'])
    owners_count = len(set(r.organization_id for r in requirements if r.organization_id)) or 1

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
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Quotation).where(Quotation.organization_id == user_id))
    quotations = list(result.scalars().all())

    total = len(quotations)
    open_count = len([q for q in quotations if q.status in ['Draft', 'Sent', 'Under Review']])
    at_risk = len([q for q in quotations if q.status == 'Expired'])
    owners_count = len(set(q.organization_id for q in quotations if q.organization_id)) or 1

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
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(SalesOrder).where(SalesOrder.organization_id == user_id))
    sales_orders = list(result.scalars().all())

    total = len(sales_orders)
    open_count = len([so for so in sales_orders if so.status in ['Pending', 'Confirmed']])
    at_risk = len([so for so in sales_orders if so.status == 'Cancelled'])
    owners_count = len(set(so.organization_id for so in sales_orders if so.organization_id)) or 1

    summary = {
        "total_orders": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count,
    }

    return {"summary": summary, "sales_orders": sales_orders}
