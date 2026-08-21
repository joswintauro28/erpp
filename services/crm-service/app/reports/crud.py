from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_reports(db: AsyncSession):
    result = await db.execute(select(models.Report))
    return result.scalars().all()
