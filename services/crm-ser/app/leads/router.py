from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database
from app.leads import schemas, crud

router = APIRouter(prefix="/api/leads", tags=["leads"])

@router.get("", response_model=schemas.LeadManagementData)
def get_leads_data(db: Session = Depends(database.get_db)):
    leads = crud.get_leads(db)
    
    total = len(leads)
    open_count = len([l for l in leads if l.status in ['New', 'Qualified', 'In Progress']])
    at_risk = len([l for l in leads if l.status == 'Lost'])
    owners_count = len(set(l.owner for l in leads if l.owner)) or 1
    
    summary = {
        "total_leads": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "leads": leads
    }
