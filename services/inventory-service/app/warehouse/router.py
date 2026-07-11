from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.warehouse.schemas import WarehouseCreate, WarehouseOut, WarehouseUpdate
from app.warehouse.services import WarehouseService

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseOut])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = WarehouseService(db)
    return await service.list_warehouses(user_id)


@router.post("", response_model=WarehouseOut, status_code=201)
async def create_warehouse(
    req: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = WarehouseService(db)
    return await service.create_warehouse(user_id, **req.model_dump())


@router.get("/{warehouse_id}", response_model=WarehouseOut)
async def get_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = WarehouseService(db)
    warehouse = await service.get_warehouse(warehouse_id, user_id)
    if not warehouse:
        raise NotFoundException("Warehouse not found")
    return warehouse


@router.put("/{warehouse_id}", response_model=WarehouseOut)
async def update_warehouse(
    warehouse_id: int,
    req: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = WarehouseService(db)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    warehouse = await service.update_warehouse(warehouse_id, user_id, **data)
    if not warehouse:
        raise NotFoundException("Warehouse not found")
    return warehouse


@router.delete("/{warehouse_id}", status_code=204)
async def delete_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = WarehouseService(db)
    deleted = await service.delete_warehouse(warehouse_id, user_id)
    if not deleted:
        raise NotFoundException("Warehouse not found")
