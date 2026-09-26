from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_requirements(db: AsyncSession, organization_id: int):
    stmt = select(models.Requirement).filter(models.Requirement.organization_id == organization_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
