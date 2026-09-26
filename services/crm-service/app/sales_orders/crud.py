from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_sales_orders(db: AsyncSession, organization_id: int):
    stmt = select(models.SalesOrder).filter(models.SalesOrder.organization_id == organization_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
