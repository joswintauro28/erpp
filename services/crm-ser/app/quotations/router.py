from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database
from app.quotations import schemas, crud

router = APIRouter(prefix="/api/quotations", tags=["quotations"])

@router.get("", response_model=schemas.QuotationManagementData)
def get_quotations_data(db: Session = Depends(database.get_db)):
    quotations = crud.get_quotations(db)
    
    total = len(quotations)
    open_count = len([q for q in quotations if q.status in ['Draft', 'Sent', 'Under Review']])
    at_risk = len([q for q in quotations if q.status == 'Expired'])
    owners_count = len(set(q.owner for q in quotations if q.owner)) or 1
    
    summary = {
        "total_quotations": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "quotations": quotations
    }
