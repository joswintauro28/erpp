from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_contacts(db: AsyncSession):
    result = await db.execute(select(models.Contact))
    return result.scalars().all()
