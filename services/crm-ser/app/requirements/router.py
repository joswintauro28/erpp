from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database
from app.requirements import schemas, crud

router = APIRouter(prefix="/api/requirements", tags=["requirements"])

@router.get("", response_model=schemas.RequirementManagementData)
def get_requirements_data(db: Session = Depends(database.get_db)):
    requirements = crud.get_requirements(db)
    
    total = len(requirements)
    open_count = len([r for r in requirements if r.status in ['Draft', 'Review']])
    at_risk = len([r for r in requirements if r.status == 'Cancelled'])
    owners_count = len(set(r.owner for r in requirements if r.owner)) or 1
    
    summary = {
        "total_requirements": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "requirements": requirements
    }
