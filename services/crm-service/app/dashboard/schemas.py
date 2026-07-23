from pydantic import BaseModel
from typing import List

class MetricBase(BaseModel):
    name: str
    value: float
    formatted_value: str
    trend: str
    is_positive: bool

class Metric(MetricBase):
    id: int
    class Config:
        from_attributes = True

class PipelineStageBase(BaseModel):
    name: str
    value: float
    color: str

class PipelineStage(PipelineStageBase):
    id: int
    class Config:
        from_attributes = True

class RecommendationBase(BaseModel):
    text: str
    confidence: int
    type: str

class Recommendation(RecommendationBase):
    id: int
    class Config:
        from_attributes = True

class DashboardData(BaseModel):
    metrics: List[Metric]
    pipeline_stages: List[PipelineStage]
    recommendations: List[Recommendation]
