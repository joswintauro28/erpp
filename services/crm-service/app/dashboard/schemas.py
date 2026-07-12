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


class HotLeadBase(BaseModel):
    name: str
    status: str


class HotLead(HotLeadBase):
    id: int
    class Config:
        from_attributes = True


class DashboardData(BaseModel):
    metrics: List[Metric]
    pipeline_stages: List[PipelineStage]
    recommendations: List[Recommendation]
    hot_leads: List[HotLead]


class Summary(BaseModel):
    total: int
    open: int
    overdue_at_risk: int
    owners: int


class ReportBase(BaseModel):
    id_str: str
    title: str
    category: str
    last_run: str
    status: str
    organization_id: int


class Report(ReportBase):
    id: int
    class Config:
        from_attributes = True


class ReportManagementData(BaseModel):
    summary: Summary
    reports: List[Report]


class RepSale(BaseModel):
    rep: str
    amount: float


class LeadStatusDist(BaseModel):
    status: str
    count: int


class OppStageDist(BaseModel):
    stage: str
    count: int


class ReportSummary(BaseModel):
    win_rate: float
    lead_conv_rate: float
    total_sales_value: float
    total_opportunities: int


class ReportsDashboardData(BaseModel):
    summary: ReportSummary
    rep_sales: List[RepSale]
    lead_status: List[LeadStatusDist]
    opp_stages: List[OppStageDist]
