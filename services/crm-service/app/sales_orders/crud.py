from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_sales_orders(db: AsyncSession):
    result = await db.execute(select(models.SalesOrder))
    return result.scalars().all()
