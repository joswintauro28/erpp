from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_leads(db: AsyncSession):
    result = await db.execute(select(models.Lead))
    return result.scalars().all()
