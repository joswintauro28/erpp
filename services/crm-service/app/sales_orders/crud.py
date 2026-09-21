from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_sales_orders(db: AsyncSession, owner_id: int | None = None):
    stmt = select(models.SalesOrder)
    if owner_id is not None:
        stmt = stmt.filter(models.SalesOrder.owner_id == owner_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
