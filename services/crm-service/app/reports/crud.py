from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_reports(db: AsyncSession, organization_id: int):
    stmt = select(models.Report).filter(models.Report.organization_id == organization_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
