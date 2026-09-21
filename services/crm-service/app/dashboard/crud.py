from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_metrics(db: AsyncSession, owner_id: int | None = None):
    stmt = select(models.Metric)
    if owner_id is not None:
        stmt = stmt.filter(models.Metric.owner_id == owner_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_pipeline_stages(db: AsyncSession, owner_id: int | None = None):
    stmt = select(models.PipelineStage)
    if owner_id is not None:
        stmt = stmt.filter(models.PipelineStage.owner_id == owner_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_recommendations(db: AsyncSession, owner_id: int | None = None):
    stmt = select(models.Recommendation)
    if owner_id is not None:
        stmt = stmt.filter(models.Recommendation.owner_id == owner_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
