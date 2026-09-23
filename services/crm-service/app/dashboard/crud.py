from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

# Dashboard tables (metrics, pipeline_stages, recommendations) have no owner_id
# column — they are global template/aggregate rows, not per-user records.

async def get_metrics(db: AsyncSession):
    result = await db.execute(select(models.Metric))
    return list(result.scalars().all())

async def get_pipeline_stages(db: AsyncSession):
    result = await db.execute(select(models.PipelineStage))
    return list(result.scalars().all())

async def get_recommendations(db: AsyncSession):
    result = await db.execute(select(models.Recommendation))
    return list(result.scalars().all())
