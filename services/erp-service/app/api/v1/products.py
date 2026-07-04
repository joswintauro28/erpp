from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services.product_service import create_product, delete_product, get_product, list_products, update_product

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=list[ProductOut])
def get_products(
    user_id: int = Depends(require_permission("products.view")),
    db: Session = Depends(get_db),
):
    return list_products(db, user_id)


@router.post("/", response_model=ProductOut, status_code=201)
def create(
    body: ProductCreate,
    user_id: int = Depends(require_permission("products.create")),
    db: Session = Depends(get_db),
):
    return create_product(db, user_id, body.model_dump())


@router.get("/{product_id}", response_model=ProductOut)
def get(
    product_id: int,
    user_id: int = Depends(require_permission("products.view")),
    db: Session = Depends(get_db),
):
    return get_product(db, product_id, user_id)


@router.put("/{product_id}", response_model=ProductOut)
def update(
    product_id: int,
    body: ProductUpdate,
    user_id: int = Depends(require_permission("products.edit")),
    db: Session = Depends(get_db),
):
    return update_product(db, product_id, user_id, body.model_dump(exclude_unset=True))


@router.delete("/{product_id}", status_code=204)
def delete(
    product_id: int,
    user_id: int = Depends(require_permission("products.delete")),
    db: Session = Depends(get_db),
):
    delete_product(db, product_id, user_id)
