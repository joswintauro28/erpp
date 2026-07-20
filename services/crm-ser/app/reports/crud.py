from sqlalchemy.orm import Session
from app import models

def get_reports(db: Session):
    return db.query(models.Report).all()
