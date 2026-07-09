from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id, get_current_token_payload
from app.integrations.billing_client import get_dashboard_billing, get_invoices, get_invoice_summary
from app.dashboard.services import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=dict)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(db, token)
    return await service.get_stats(user_id)


@router.get("/recent-invoices", response_model=list)
async def recent_invoices(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    invoices = await get_invoices(token, {"limit": "5"})
    return invoices[:5]


@router.get("/revenue-trend", response_model=list)
async def revenue_trend(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    billing = await get_dashboard_billing(token)
    return billing.get("revenueTrend", [])


@router.get("/invoice-summary", response_model=dict)
async def invoice_summary(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_invoice_summary(token)


@router.get("/client-growth", response_model=list)
async def client_growth(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(db, token)
    return await service.get_client_growth(user_id)


@router.get("/payment-analytics", response_model=dict)
async def payment_analytics(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(db, token)
    return await service.get_payment_analytics(token)
