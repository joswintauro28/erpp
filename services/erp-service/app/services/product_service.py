from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.product import Product


def list_products(db: Session, owner_id: int) -> list[Product]:
    return db.execute(
        select(Product).where(Product.owner_id == owner_id).order_by(Product.created_at.desc())
    ).scalars().all()


def get_product(db: Session, product_id: int, owner_id: int) -> Product:
    product = db.execute(
        select(Product).where(Product.id == product_id, Product.owner_id == owner_id)
    ).scalar_one_or_none()
    if not product:
        raise NotFoundException("Product not found")
    return product


def create_product(db: Session, owner_id: int, data: dict) -> Product:
    product = Product(owner_id=owner_id, **data)
    db.add(product)
    db.flush()
    return product


def update_product(db: Session, product_id: int, owner_id: int, data: dict) -> Product:
    product = get_product(db, product_id, owner_id)
    for key, value in data.items():
        if value is not None:
            setattr(product, key, value)
    db.flush()
    return product


def delete_product(db: Session, product_id: int, owner_id: int):
    product = get_product(db, product_id, owner_id)
    db.delete(product)
    db.flush()
