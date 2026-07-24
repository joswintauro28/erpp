from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SearchRequest(BaseModel):
    city: Optional[str] = None
    industry: Optional[str] = None
    company_name: Optional[str] = None
    refresh: Optional[bool] = False

class PublicContact(BaseModel):
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    linkedin: Optional[str] = ""

class KeyDecisionMaker(BaseModel):
    name: Optional[str] = ""
    title: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    linkedin: Optional[str] = ""

class CompanyDetail(BaseModel):
    company_name: str
    industry: str
    location: str
    website: Optional[str] = ""
    estimated_employees: Optional[str] = ""
    estimated_revenue: Optional[str] = ""
    company_overview: Optional[str] = ""
    industry_details: Optional[str] = ""
    ai_readiness_score: int = 0
    detected_technologies: List[str] = []
    business_pain_points: List[str] = []
    recommended_ai_solutions: List[str] = []
    key_decision_makers: List[KeyDecisionMaker] = []
    public_contact: PublicContact
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    class Config:
        from_attributes = True

class SearchMetadata(BaseModel):
    city: str = ""
    industry: str = ""
    company_name: str = ""

class SearchResponse(BaseModel):
    search: SearchMetadata
    companies: List[CompanyDetail]

class ImportLeadsRequest(BaseModel):
    companies: List[CompanyDetail]

