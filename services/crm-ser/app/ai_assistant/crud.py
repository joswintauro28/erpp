from sqlalchemy.orm import Session
from app import models

def get_ai_logs(db: Session):
    return db.query(models.AIAssistantLog).all()
