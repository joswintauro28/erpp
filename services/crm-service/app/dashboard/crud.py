from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models

async def get_metrics(db: AsyncSession, organization_id: int):
    result = await db.execute(select(models.Metric).filter(models.Metric.organization_id == organization_id))
    return list(result.scalars().all())

async def get_pipeline_stages(db: AsyncSession, organization_id: int):
    result = await db.execute(select(models.PipelineStage).filter(models.PipelineStage.organization_id == organization_id))
    return list(result.scalars().all())

async def get_recommendations(db: AsyncSession, organization_id: int):
    result = await db.execute(select(models.Recommendation).filter(models.Recommendation.organization_id == organization_id))
    return list(result.scalars().all())

async def get_hot_leads(db: AsyncSession, organization_id: int):
    result = await db.execute(select(models.HotLead).filter(models.HotLead.organization_id == organization_id))
    return list(result.scalars().all())
