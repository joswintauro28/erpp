from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import models
from . import schemas
from . import scraper

import logging

router = APIRouter(prefix="/api/lead-discovery", tags=["lead-discovery"])

@router.post("/search", response_model=schemas.SearchResponse)
async def search_companies(request: schemas.SearchRequest, db: Session = Depends(get_db)):
    city = request.city or ""
    industry = request.industry or ""
    company_name = request.company_name or ""
    
    valid_companies = []
    
    # Trigger live discovery
    try:
        discovered = await scraper.discover_and_qualify_companies(city, industry, max_companies=50, company_name=company_name)
        
        for c_data in discovered:
            c_name = c_data.get("company_name", "").strip()
            c_url = c_data.get("website", "").strip()
            c_name_lower = c_name.lower()
            
            if not c_name or not c_url or any(p in c_name_lower for p in ["unknown", "not found", "n/a", "placeholder"]):
                continue
            if scraper.is_directory_url(c_url, c_name):
                continue
            if any(kw in c_name_lower for kw in ["list", "hubs in", "events in", "amazing facts", "startups in", "workforce in", "illinois tech"]):
                continue
            if c_name_lower in ["mumbai", "water coolers"]:
                continue
                
            public_contact_data = c_data.get("public_contact", {})
            contact = schemas.PublicContact(
                email=public_contact_data.get("email") or "",
                phone=public_contact_data.get("phone") or "",
                address=public_contact_data.get("address") or "",
                linkedin=public_contact_data.get("linkedin") or ""
            )
            
            comp_detail = schemas.CompanyDetail(
                company_name=c_data.get("company_name"),
                industry=industry or c_data.get("industry") or "Unknown",
                location=city.title() if city else (c_data.get("location") or "Unknown").title(),
                website=c_data.get("website"),
                estimated_employees=str(c_data.get("estimated_employees") or c_data.get("num_employees") or "Unknown"),
                estimated_revenue=str(c_data.get("estimated_revenue") or (f"₹{c_data.get('num_revenue')}Cr" if c_data.get("num_revenue") else "Unknown")),
                company_overview=c_data.get("company_overview") or "",
                ai_readiness_score=c_data.get("ai_readiness_score") or 0,
                detected_technologies=c_data.get("detected_technologies") or [],
                business_pain_points=c_data.get("business_pain_points") or [],
                recommended_ai_solutions=c_data.get("recommended_ai_solutions") or [],
                key_decision_makers=c_data.get("key_decision_makers") or [],
                public_contact=contact,
                latitude=None,
                longitude=None
            )
            valid_companies.append(comp_detail)
            
    except Exception as e:
        scraper.logger.error(f"Error during live discovery: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to discover leads: {str(e)}")
            
    return schemas.SearchResponse(
        search=schemas.SearchMetadata(city=city, industry=industry, company_name=company_name),
        companies=valid_companies
    )

class ScrapeUrlRequest(schemas.BaseModel):
    url: str

@router.post("/scrape-url")
async def scrape_url_endpoint(request: ScrapeUrlRequest, db: Session = Depends(get_db)):
    # Reset quota flag so stale state from a previous request doesn't block this one
    scraper.LLM_CLIENT.daily_quota_exhausted = False

    url = request.url.strip()
    if not url.startswith("http"):
        url = "https://" + url
        
    try:
        text, contacts = await scraper.fetch_webpage_text(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to crawl website: {str(e)}")
        
    if not text or len(text) < 100:
        raise HTTPException(status_code=400, detail="Could not extract sufficient text from the website.")
        
    import json
    from urllib.parse import urlparse

    try:
        system_prompt = "You are a professional business capability and technology intelligence analyst."
        user_prompt = f"""
        Analyze the following text content crawled from a company's website ({url}) and generate a detailed business and capability intelligence summary.
        
        Provide the analysis in structured JSON matching this schema:
        {{
            "company_name": "Name of the company",
            "website": "{url}",
            "industry": "Primary industry classification",
            "company_overview": "A detailed business description and value proposition (2-3 paragraphs)",
            "detected_technologies": ["List of software, frameworks, and analytics detected from content"],
            "business_pain_points": ["List of likely B2B operational pain points or challenges they face"],
            "recommended_ai_solutions": ["List of highly specific recommended AI/automation solutions custom to their business model"],
            "key_decision_makers": ["Names or typical titles of key decision makers if mentioned"],
            "contact_info": {{
                "email": "Email address if found",
                "phone": "Phone number if found",
                "address": "Physical address if found",
                "linkedin": "LinkedIn profile link if found"
            }}
        }}
        
        Text Content:
        {text[:8000]}
        """
        response_text = await scraper.LLM_CLIENT.generate_json(system_prompt, user_prompt)
        clean_json = response_text.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
        
        data = json.loads(clean_json)
        
        return {
            "company_name": data.get("company_name", "Unknown"),
            "website": data.get("website", url),
            "industry": data.get("industry", "Unknown"),
            "location": (data.get("contact_info") or {}).get("address") or contacts.get("address") or "Unknown",
            "estimated_employees": "Unknown",
            "estimated_revenue": "Unknown",
            "company_overview": data.get("company_overview", ""),
            "industry_details": "Scraped from direct website input.",
            "ai_readiness_score": 60,
            "detected_technologies": data.get("detected_technologies", []),
            "business_pain_points": data.get("business_pain_points", []),
            "recommended_ai_solutions": data.get("recommended_ai_solutions", []),
            "key_decision_makers": data.get("key_decision_makers", []),
            "public_contact": {
                "email": (data.get("contact_info") or {}).get("email") or contacts.get("email") or "Unknown",
                "phone": (data.get("contact_info") or {}).get("phone") or contacts.get("phone") or "Unknown",
                "address": (data.get("contact_info") or {}).get("address") or contacts.get("address") or "Unknown",
                "linkedin": (data.get("contact_info") or {}).get("linkedin") or contacts.get("linkedin") or "Unknown"
            }
        }
    except Exception as e:
        err_str = str(e)
        # If this is a quota/rate-limit error, return a best-effort result using raw scraped
        # contacts rather than crashing the whole request with a 500.
        is_quota_error = "quota" in err_str.lower() or "rate" in err_str.lower() or "exhausted" in err_str.lower()
        if is_quota_error:
            scraper.logger.warning(f"LLM quota error for {url}, returning basic scraped data as fallback: {e}")
            hostname = urlparse(url).hostname or url
            company_name_guess = hostname.replace("www.", "").split(".")[0].title()
            return {
                "company_name": company_name_guess,
                "website": url,
                "industry": "Unknown",
                "location": contacts.get("address") or "Unknown",
                "estimated_employees": "Unknown",
                "estimated_revenue": "Unknown",
                "company_overview": (
                    "AI summary unavailable — API quota exhausted. "
                    "Basic contact information was extracted directly from the website."
                ),
                "industry_details": "Scraped from direct website input (no AI analysis).",
                "ai_readiness_score": 0,
                "detected_technologies": [],
                "business_pain_points": [],
                "recommended_ai_solutions": [],
                "key_decision_makers": [],
                "public_contact": {
                    "email": contacts.get("email") or "Unknown",
                    "phone": contacts.get("phone") or "Unknown",
                    "address": contacts.get("address") or "Unknown",
                    "linkedin": contacts.get("linkedin") or "Unknown"
                },
                "quota_warning": "AI quota exhausted. Analysis is unavailable until the quota resets (usually within 24 hours)."
            }
        raise HTTPException(status_code=500, detail=f"Failed to generate AI summary: {err_str}")

@router.post("/import")
async def import_leads(request: schemas.ImportLeadsRequest, db: Session = Depends(get_db)):
    import random
    from datetime import datetime
    try:
        for c_data in request.companies:
            est_value = 0
            rev_str = c_data.estimated_revenue or ""
            if "$" in rev_str or "₹" in rev_str:
                import re
                nums = re.findall(r'\d+', rev_str)
                if nums:
                    est_value = int(nums[0]) * 1000000 if 'M' in rev_str or 'Cr' in rev_str else int(nums[0])
            
            contact_name = c_data.company_name
            if c_data.key_decision_makers and len(c_data.key_decision_makers) > 0:
                contact_name = c_data.key_decision_makers[0]

            new_lead = models.Lead(
                id_str=f"LD-{random.randint(1000, 9999)}",
                name=contact_name,
                company=c_data.company_name,
                source="AI Discovery",
                est_value=est_value,
                status="New",
                owner="Unassigned",
                updated_at=datetime.now().strftime("%Y-%m-%d")
            )
            db.add(new_lead)

            # Auto-pin during import
            existing_pin = db.query(models.PinnedLead).filter(models.PinnedLead.company_name == c_data.company_name).first()
            if not existing_pin:
                pin_obj = models.PinnedLead(
                    company_name=c_data.company_name,
                    industry=c_data.industry,
                    location=c_data.location,
                    website=c_data.website,
                    estimated_employees=c_data.estimated_employees,
                    estimated_revenue=c_data.estimated_revenue,
                    company_overview=c_data.company_overview,
                    ai_readiness_score=c_data.ai_readiness_score,
                    detected_technologies=c_data.detected_technologies,
                    business_pain_points=c_data.business_pain_points,
                    recommended_ai_solutions=c_data.recommended_ai_solutions,
                    key_decision_makers=c_data.key_decision_makers,
                    public_contact=c_data.public_contact.dict()
                )
                db.add(pin_obj)

        db.commit()
        return {"message": f"Successfully imported {len(request.companies)} leads."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import leads: {str(e)}")

@router.get("/pinned", response_model=List[schemas.CompanyDetail])
def get_pinned_leads(db: Session = Depends(get_db)):
    pinned = db.query(models.PinnedLead).all()
    res = []
    for p in pinned:
        res.append(schemas.CompanyDetail(
            company_name=p.company_name,
            industry=p.industry or "Unknown",
            location=p.location or "Unknown",
            website=p.website or "",
            estimated_employees=p.estimated_employees or "",
            estimated_revenue=p.estimated_revenue or "",
            company_overview=p.company_overview or "",
            ai_readiness_score=p.ai_readiness_score or 0,
            detected_technologies=p.detected_technologies or [],
            business_pain_points=p.business_pain_points or [],
            recommended_ai_solutions=p.recommended_ai_solutions or [],
            key_decision_makers=p.key_decision_makers or [],
            public_contact=schemas.PublicContact(
                email=(p.public_contact or {}).get("email") or "",
                phone=(p.public_contact or {}).get("phone") or "",
                address=(p.public_contact or {}).get("address") or "",
                linkedin=(p.public_contact or {}).get("linkedin") or ""
            )
        ))
    return res

@router.post("/pinned")
def pin_lead(company: schemas.CompanyDetail, db: Session = Depends(get_db)):
    existing = db.query(models.PinnedLead).filter(models.PinnedLead.company_name == company.company_name).first()
    if existing:
        return {"status": "already pinned"}
        
    db_obj = models.PinnedLead(
        company_name=company.company_name,
        industry=company.industry,
        location=company.location,
        website=company.website,
        estimated_employees=company.estimated_employees,
        estimated_revenue=company.estimated_revenue,
        company_overview=company.company_overview,
        ai_readiness_score=company.ai_readiness_score,
        detected_technologies=company.detected_technologies,
        business_pain_points=company.business_pain_points,
        recommended_ai_solutions=company.recommended_ai_solutions,
        key_decision_makers=company.key_decision_makers,
        public_contact=company.public_contact.dict()
    )
    db.add(db_obj)
    db.commit()
    return {"status": "success"}

@router.delete("/pinned/{company_name}")
def unpin_lead(company_name: str, db: Session = Depends(get_db)):
    db_obj = db.query(models.PinnedLead).filter(models.PinnedLead.company_name == company_name).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return {"status": "success"}

@router.get("/pinned/{company_name}", response_model=Optional[schemas.CompanyDetail])
def get_pinned_lead_detail(company_name: str, db: Session = Depends(get_db)):
    p = db.query(models.PinnedLead).filter(models.PinnedLead.company_name == company_name).first()
    if not p:
        return None
    return schemas.CompanyDetail(
        company_name=p.company_name,
        industry=p.industry or "Unknown",
        location=p.location or "Unknown",
        website=p.website or "",
        estimated_employees=p.estimated_employees or "",
        estimated_revenue=p.estimated_revenue or "",
        company_overview=p.company_overview or "",
        ai_readiness_score=p.ai_readiness_score or 0,
        detected_technologies=p.detected_technologies or [],
        business_pain_points=p.business_pain_points or [],
        recommended_ai_solutions=p.recommended_ai_solutions or [],
        key_decision_makers=p.key_decision_makers or [],
        public_contact=schemas.PublicContact(
            email=(p.public_contact or {}).get("email") or "",
            phone=(p.public_contact or {}).get("phone") or "",
            address=(p.public_contact or {}).get("address") or "",
            linkedin=(p.public_contact or {}).get("linkedin") or ""
        )
    )
