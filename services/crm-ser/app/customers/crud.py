from sqlalchemy.orm import Session
from app import models

def get_customers(db: Session):
    return db.query(models.Customer).all()
