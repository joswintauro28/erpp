from sqlalchemy.orm import Session
import models, schemas

def get_metrics(db: Session):
    return db.query(models.Metric).all()

def get_pipeline_stages(db: Session):
    return db.query(models.PipelineStage).all()

def get_recommendations(db: Session):
    return db.query(models.Recommendation).all()

def get_customers(db: Session):
    return db.query(models.Customer).all()

def get_contacts(db: Session):
    return db.query(models.Contact).all()

def get_documents(db: Session):
    return db.query(models.Document).all()

def get_leads(db: Session):
    return db.query(models.Lead).all()

def get_opportunities(db: Session):
    return db.query(models.Opportunity).all()

def get_sales(db: Session):
    return db.query(models.Sale).all()

def get_requirements(db: Session):
    return db.query(models.Requirement).all()

def get_quotations(db: Session):
    return db.query(models.Quotation).all()

def get_sales_orders(db: Session):
    return db.query(models.SalesOrder).all()

def get_enquiries(db: Session): return db.query(models.Enquiry).all()
def get_site_visits(db: Session): return db.query(models.SiteVisit).all()
def get_follow_ups(db: Session): return db.query(models.FollowUp).all()
def get_tasks(db: Session): return db.query(models.Task).all()
def get_communications(db: Session): return db.query(models.Communication).all()
def get_visit_plans(db: Session): return db.query(models.VisitPlan).all()
def get_complaints(db: Session): return db.query(models.Complaint).all()
def get_feedback(db: Session): return db.query(models.Feedback).all()

def get_reports(db: Session): return db.query(models.Report).all()
def get_ai_logs(db: Session): return db.query(models.AIAssistantLog).all()
def get_admins(db: Session): return db.query(models.Admin).all()
