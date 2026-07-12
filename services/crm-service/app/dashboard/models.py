from sqlalchemy import Column, Integer, String, Float, Boolean

from app.core.database import Base


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    value = Column(Float)
    formatted_value = Column(String)
    trend = Column(String)
    is_positive = Column(Boolean)


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    value = Column(Float)
    color = Column(String)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    confidence = Column(Integer)
    type = Column(String)


class HotLead(Base):
    __tablename__ = "hot_leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    status = Column(String)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    id_str = Column(String, index=True)
    title = Column(String)
    category = Column(String)
    last_run = Column(String)
    status = Column(String)
    organization_id = Column(Integer, nullable=False, index=True)
