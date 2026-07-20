from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database
from app.opportunities import schemas, crud

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])

@router.get("", response_model=schemas.OpportunityManagementData)
def get_opportunities_data(db: Session = Depends(database.get_db)):
    opportunities = crud.get_opportunities(db)
    
    total = len(opportunities)
    open_count = len([o for o in opportunities if o.stage in ['Discovery', 'Proposal', 'Negotiation']])
    at_risk = len([o for o in opportunities if o.stage == 'Lost'])
    owners_count = len(set(o.owner for o in opportunities if o.owner)) or 1
    
    summary = {
        "total_opportunities": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "opportunities": opportunities
    }
