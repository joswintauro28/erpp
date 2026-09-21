from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, require_permission
from app.core.exceptions import NotFoundException
from app.supplier.schemas import SupplierCreate, SupplierOut, SupplierUpdate
from app.supplier.services import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierOut])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = SupplierService(db)
    return await service.list_suppliers(org_id)


@router.post("", response_model=SupplierOut, status_code=201)
async def create_supplier(
    req: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("suppliers.create")),
):
    service = SupplierService(db)
    return await service.create_supplier(org_id, **req.model_dump())


@router.get("/{supplier_id}", response_model=SupplierOut)
async def get_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = SupplierService(db)
    supplier = await service.get_supplier(supplier_id, org_id)
    if not supplier:
        raise NotFoundException("Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    req: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("suppliers.manage")),
):
    service = SupplierService(db)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    supplier = await service.update_supplier(supplier_id, org_id, **data)
    if not supplier:
        raise NotFoundException("Supplier not found")
    return supplier


@router.delete("/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("suppliers.manage")),
):
    service = SupplierService(db)
    deleted = await service.delete_supplier(supplier_id, org_id)
    if not deleted:
        raise NotFoundException("Supplier not found")
