from sqlalchemy.orm import Session
from app import models

def get_leads(db: Session):
    return db.query(models.Lead).all()
