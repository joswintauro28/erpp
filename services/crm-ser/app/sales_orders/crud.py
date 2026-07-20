from sqlalchemy.orm import Session
from app import models

def get_sales_orders(db: Session):
    return db.query(models.SalesOrder).all()
