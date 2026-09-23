from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app import models

async def get_sales_orders(db: AsyncSession, owner_id: int | None = None, is_admin: bool = False):
    stmt = select(models.SalesOrder)
    if not is_admin and owner_id is not None:
        stmt = stmt.filter(or_(models.SalesOrder.owner_id == owner_id, models.SalesOrder.owner_id.is_(None)))
    result = await db.execute(stmt)
    return list(result.scalars().all())
