from sqlalchemy.orm import Session
from app import models

def get_quotations(db: Session):
    return db.query(models.Quotation).all()
