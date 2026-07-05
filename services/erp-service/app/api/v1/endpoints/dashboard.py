from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user_id
from app.schemas.dashboard import DashboardStats
from app.services.dashboard import DashboardService
from app.services.invoice import InvoiceService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = DashboardService(db)
    return await service.get_stats(user_id)


@router.get("/recent-invoices")
async def recent_invoices(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    return await service.get_recent_invoices(user_id)


@router.get("/revenue-trend")
async def revenue_trend(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    return await service.get_revenue_trend(user_id)


@router.get("/invoice-summary")
async def invoice_summary(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InvoiceService(db)
    return await service.get_invoice_summary(user_id)


@router.get("/client-growth")
async def client_growth(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = DashboardService(db)
    return await service.get_client_growth(user_id)


@router.get("/payment-analytics")
async def payment_analytics(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = DashboardService(db)
    return await service.get_payment_analytics(user_id)
