from sqlalchemy import Column, Integer, String, JSON, Float
from app.database import Base

class PinnedLead(Base):
    __tablename__ = "pinned_leads"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True, nullable=True)
    company_name = Column(String, unique=True, index=True)
    industry = Column(String, nullable=True)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)
    estimated_employees = Column(String, nullable=True)
    estimated_revenue = Column(String, nullable=True)
    company_overview = Column(String, nullable=True)
    ai_readiness_score = Column(Integer, nullable=True)
    detected_technologies = Column(JSON, nullable=True)
    business_pain_points = Column(JSON, nullable=True)
    recommended_ai_solutions = Column(JSON, nullable=True)
    key_decision_makers = Column(JSON, nullable=True)
    public_contact = Column(JSON, nullable=True)
    industry_details = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
