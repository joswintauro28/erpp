from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_opportunities(db: AsyncSession):
    result = await db.execute(select(models.Opportunity))
    return result.scalars().all()
