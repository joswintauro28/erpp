from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_requirements(db: AsyncSession):
    result = await db.execute(select(models.Requirement))
    return result.scalars().all()
