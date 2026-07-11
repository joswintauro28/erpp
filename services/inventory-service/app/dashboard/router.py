from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.dashboard.services import InventoryDashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/inventory")
async def get_inventory_kpis(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InventoryDashboardService(db)
    return await service.get_kpis(user_id)


@router.get("/inventory/low-stock")
async def get_low_stock(
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InventoryDashboardService(db)
    return await service.get_low_stock_products(user_id, limit)


@router.get("/inventory/movements")
async def get_recent_movements(
    limit: int = Query(10),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InventoryDashboardService(db)
    return await service.get_recent_movements(user_id, limit)


@router.get("/inventory/warehouses")
async def get_warehouse_summary(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = InventoryDashboardService(db)
    return await service.get_warehouse_summary(user_id)
