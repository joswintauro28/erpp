from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database
from app.contacts import schemas, crud

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

@router.get("", response_model=schemas.ContactManagementData)
def get_contacts_data(db: Session = Depends(database.get_db)):
    contacts = crud.get_contacts(db)
    
    total = len(contacts)
    open_count = len([c for c in contacts if c.type in ['Primary', 'Decision']])
    at_risk = len([c for c in contacts if c.type in ['Inactive']])
    owners_count = 5 # hardcoded to match UI for now since owners aren't strictly on contacts
    
    summary = {
        "total_contacts": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "contacts": contacts
    }
