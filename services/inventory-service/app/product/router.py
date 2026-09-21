from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_org_id, require_permission
from app.core.exceptions import NotFoundException, ConflictException
from app.product.schemas import ProductCreate, ProductOut, ProductUpdate
from app.product.services import ProductService

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = ProductService(db)
    return await service.list_products(org_id)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    req: ProductCreate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("products.create")),
):
    service = ProductService(db)
    if req.sku:
        existing = await service.repo.list(sku=req.sku)
        if existing:
            raise ConflictException("Product with this SKU already exists")
    return await service.create_product(org_id, **req.model_dump())


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
):
    service = ProductService(db)
    product = await service.get_product(product_id, org_id)
    if not product:
        raise NotFoundException("Product not found")
    return product


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    req: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("products.edit")),
):
    service = ProductService(db)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    product = await service.update_product(product_id, org_id, **data)
    if not product:
        raise NotFoundException("Product not found")
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    org_id: int = Depends(get_current_org_id),
    _perm: bool = Depends(require_permission("products.delete")),
):
    service = ProductService(db)
    deleted = await service.delete_product(product_id, org_id)
    if not deleted:
        raise NotFoundException("Product not found")
