from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_customers(db: AsyncSession, organization_id: int):
    stmt = select(models.Customer).filter(models.Customer.organization_id == organization_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
