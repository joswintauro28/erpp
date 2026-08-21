from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_ai_logs(db: AsyncSession):
    result = await db.execute(select(models.AIAssistantLog))
    return result.scalars().all()
