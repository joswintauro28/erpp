from sqlalchemy.orm import Session
from app import models

def get_contacts(db: Session):
    return db.query(models.Contact).all()
