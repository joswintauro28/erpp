import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.product.models import Product
from app.core.database import BaseRepository


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Product)


class ProductService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProductRepository(db)

    async def list_products(self, owner_id: int) -> list[Product]:
        stmt = sa.select(Product).where(Product.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_product(self, product_id: int, owner_id: int) -> Product | None:
        stmt = sa.select(Product).where(
            Product.id == product_id,
            Product.owner_id == owner_id,
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_product(self, owner_id: int, **data) -> Product:
        return await self.repo.create(owner_id=owner_id, **data)

    async def update_product(self, product_id: int, owner_id: int, **data) -> Product | None:
        product = await self.get_product(product_id, owner_id)
        if not product:
            return None
        return await self.repo.update(product_id, **data)

    async def delete_product(self, product_id: int, owner_id: int) -> bool:
        product = await self.get_product(product_id, owner_id)
        if not product:
            return False
        return await self.repo.delete(product_id)

    async def count_products(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Product).where(Product.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def count_low_stock(self, owner_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Product).where(
            Product.owner_id == owner_id,
            Product.track_inventory == True,
            Product.stock <= Product.low_stock_threshold,
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
