from sqlalchemy.orm import Session
from app import models

def get_metrics(db: Session):
    return db.query(models.Metric).all()

def get_pipeline_stages(db: Session):
    return db.query(models.PipelineStage).all()

def get_recommendations(db: Session):
    return db.query(models.Recommendation).all()
