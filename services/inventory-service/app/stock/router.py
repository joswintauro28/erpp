from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id
from app.stock.schemas import StockOut, StockMovementCreate, StockMovementOut, StockAdjustment
from app.stock.services import StockService

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("", response_model=list[StockOut])
async def get_stock(
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = StockService(db)
    return await service.get_stock(org_id, product_id, warehouse_id)


@router.put("/adjust", response_model=StockOut)
async def adjust_stock(
    req: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = StockService(db)
    return await service.adjust_stock(
        org_id, req.product_id, req.warehouse_id, req.new_quantity, req.notes,
    )


@router.post("/movements", response_model=StockMovementOut, status_code=201)
async def record_movement(
    req: StockMovementCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = StockService(db)
    return await service.record_movement(org_id, **req.model_dump())


@router.get("/movements", response_model=list[StockMovementOut])
async def get_movements(
    product_id: int | None = Query(None),
    limit: int = Query(50),
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = StockService(db)
    return await service.get_movements(org_id, product_id, limit)
