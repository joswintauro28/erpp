from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_metrics(db: AsyncSession):
    result = await db.execute(select(models.Metric))
    return result.scalars().all()

async def get_pipeline_stages(db: AsyncSession):
    result = await db.execute(select(models.PipelineStage))
    return result.scalars().all()

async def get_recommendations(db: AsyncSession):
    result = await db.execute(select(models.Recommendation))
    return result.scalars().all()
