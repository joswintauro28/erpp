import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.supplier.models import Supplier
from app.core.database import BaseRepository


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Supplier)


class SupplierService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SupplierRepository(db)

    async def list_suppliers(self, organization_id: int) -> list[Supplier]:
        stmt = sa.select(Supplier).where(Supplier.organization_id == organization_id).order_by(Supplier.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_supplier(self, supplier_id: int, organization_id: int) -> Supplier | None:
        stmt = sa.select(Supplier).where(Supplier.id == supplier_id, Supplier.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_supplier(self, organization_id: int, **data) -> Supplier:
        return await self.repo.create(organization_id=organization_id, **data)

    async def update_supplier(self, supplier_id: int, organization_id: int, **data) -> Supplier | None:
        supplier = await self.get_supplier(supplier_id, organization_id)
        if not supplier:
            return None
        return await self.repo.update(supplier_id, **data)

    async def delete_supplier(self, supplier_id: int, organization_id: int) -> bool:
        supplier = await self.get_supplier(supplier_id, organization_id)
        if not supplier:
            return False
        return await self.repo.delete(supplier_id)

    async def count_suppliers(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Supplier).where(Supplier.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
