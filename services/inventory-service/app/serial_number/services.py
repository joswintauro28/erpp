import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

from app.serial_number.models import SerialNumber
from app.core.database import BaseRepository


class SerialNumberRepository(BaseRepository[SerialNumber]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, SerialNumber)


class SerialNumberService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SerialNumberRepository(db)

    async def list_serial_numbers(
        self, owner_id: int, product_id: int | None = None, warehouse_id: int | None = None,
    ) -> list[SerialNumber]:
        stmt = sa.select(SerialNumber).where(SerialNumber.owner_id == owner_id)
        if product_id:
            stmt = stmt.where(SerialNumber.product_id == product_id)
        if warehouse_id:
            stmt = stmt.where(SerialNumber.warehouse_id == warehouse_id)
        stmt = stmt.order_by(SerialNumber.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_serial_number(self, serial_id: int, owner_id: int) -> SerialNumber | None:
        stmt = sa.select(SerialNumber).where(SerialNumber.id == serial_id, SerialNumber.owner_id == owner_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_serial_number(self, owner_id: int, **data) -> SerialNumber:
        return await self.repo.create(owner_id=owner_id, **data)

    async def update_serial_number(self, serial_id: int, owner_id: int, **data) -> SerialNumber | None:
        serial = await self.get_serial_number(serial_id, owner_id)
        if not serial:
            return None
        return await self.repo.update(serial_id, **data)

    async def delete_serial_number(self, serial_id: int, owner_id: int) -> bool:
        serial = await self.get_serial_number(serial_id, owner_id)
        if not serial:
            return False
        return await self.repo.delete(serial_id)

    async def count_serial_numbers(self, owner_id: int, status: str | None = None) -> int:
        stmt = sa.select(sa.func.count()).select_from(SerialNumber).where(SerialNumber.owner_id == owner_id)
        if status:
            stmt = stmt.where(SerialNumber.status == status)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
