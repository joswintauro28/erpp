from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_customers(db: AsyncSession):
    result = await db.execute(select(models.Customer))
    return result.scalars().all()
