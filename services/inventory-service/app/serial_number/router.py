from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.core.exceptions import NotFoundException
from app.serial_number.schemas import SerialNumberCreate, SerialNumberOut, SerialNumberUpdate
from app.serial_number.services import SerialNumberService

router = APIRouter(prefix="/serial-numbers", tags=["serial-numbers"])


@router.get("", response_model=list[SerialNumberOut])
async def list_serial_numbers(
    product_id: int | None = Query(None),
    warehouse_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = SerialNumberService(db)
    return await service.list_serial_numbers(user_id, product_id, warehouse_id)


@router.post("", response_model=SerialNumberOut, status_code=201)
async def create_serial_number(
    req: SerialNumberCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = SerialNumberService(db)
    return await service.create_serial_number(user_id, **req.model_dump())


@router.get("/{serial_id}", response_model=SerialNumberOut)
async def get_serial_number(
    serial_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = SerialNumberService(db)
    serial = await service.get_serial_number(serial_id, user_id)
    if not serial:
        raise NotFoundException("Serial number not found")
    return serial


@router.put("/{serial_id}", response_model=SerialNumberOut)
async def update_serial_number(
    serial_id: int,
    req: SerialNumberUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = SerialNumberService(db)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    serial = await service.update_serial_number(serial_id, user_id, **data)
    if not serial:
        raise NotFoundException("Serial number not found")
    return serial


@router.delete("/{serial_id}", status_code=204)
async def delete_serial_number(
    serial_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = SerialNumberService(db)
    deleted = await service.delete_serial_number(serial_id, user_id)
    if not deleted:
        raise NotFoundException("Serial number not found")
