from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_documents(db: AsyncSession):
    result = await db.execute(select(models.Document))
    return result.scalars().all()
