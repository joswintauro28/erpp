from sqlalchemy.orm import Session
from app import models

def get_documents(db: Session):
    return db.query(models.Document).all()
