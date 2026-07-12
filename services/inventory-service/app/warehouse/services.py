import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.warehouse.models import Warehouse
from app.core.database import BaseRepository


class WarehouseRepository(BaseRepository[Warehouse]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, Warehouse)


class WarehouseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = WarehouseRepository(db)

    async def list_warehouses(self, organization_id: int) -> list[Warehouse]:
        stmt = sa.select(Warehouse).where(Warehouse.organization_id == organization_id).order_by(Warehouse.name)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_warehouse(self, warehouse_id: int, organization_id: int) -> Warehouse | None:
        stmt = sa.select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_warehouse(self, organization_id: int, **data) -> Warehouse:
        return await self.repo.create(organization_id=organization_id, **data)

    async def update_warehouse(self, warehouse_id: int, organization_id: int, **data) -> Warehouse | None:
        warehouse = await self.get_warehouse(warehouse_id, organization_id)
        if not warehouse:
            return None
        return await self.repo.update(warehouse_id, **data)

    async def delete_warehouse(self, warehouse_id: int, organization_id: int) -> bool:
        warehouse = await self.get_warehouse(warehouse_id, organization_id)
        if not warehouse:
            return False
        return await self.repo.delete(warehouse_id)

    async def count_warehouses(self, organization_id: int) -> int:
        stmt = sa.select(sa.func.count()).select_from(Warehouse).where(Warehouse.organization_id == organization_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
