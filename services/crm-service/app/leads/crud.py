from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app import models

async def get_leads(db: AsyncSession, owner_id: int | None = None, is_admin: bool = False):
    stmt = select(models.Lead)
    if not is_admin and owner_id is not None:
        stmt = stmt.filter(or_(models.Lead.owner_id == owner_id, models.Lead.owner_id.is_(None)))
    result = await db.execute(stmt)
    return list(result.scalars().all())
