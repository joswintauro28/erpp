from sqlalchemy.orm import Session
from app import models

def get_opportunities(db: Session):
    return db.query(models.Opportunity).all()
