from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, database
from app.dashboard import schemas, crud

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def parse_numeric_value(val_str):
    if val_str is None:
        return 0.0
    val_str = str(val_str)
    clean_str = val_str.replace("₹", "").replace("$", "").replace(",", "").strip()
    try:
        return float(clean_str) if clean_str else 0.0
    except ValueError:
        return 0.0

@router.get("", response_model=schemas.DashboardData)
def get_dashboard_data(db: Session = Depends(database.get_db)):
    open_leads = db.query(models.Lead).filter(models.Lead.status.in_(["New", "Qualified", "In Progress"])).all()
    open_opps = db.query(models.Opportunity).filter(models.Opportunity.stage.in_(["Discovery", "Proposal", "Negotiation", "RFQ / Inquiry", "Technical Assessment", "Estimation & Quoting"])).all()
    open_quotes = db.query(models.Quotation).filter(models.Quotation.status.in_(["Draft", "Sent", "Under Review"])).all()
    open_orders = db.query(models.SalesOrder).filter(models.SalesOrder.status.in_(["Pending", "Confirmed", "In Fulfillment"])).all()
    
    total_leads_val = sum(l.est_value for l in open_leads if l.est_value)
    total_opps_val = sum(parse_numeric_value(o.value) for o in open_opps)
    total_quotes_val = sum(parse_numeric_value(q.value) for q in open_quotes)
    total_orders_val = sum(parse_numeric_value(so.value) for so in open_orders)
    
    pipeline_value = total_leads_val + total_opps_val + total_quotes_val + total_orders_val
    
    if pipeline_value >= 1_000_000:
        formatted_val = f"${pipeline_value / 1_000_000:.2f}M"
    elif pipeline_value >= 1_000:
        formatted_val = f"${pipeline_value / 1_000:.0f}K"
    else:
        formatted_val = f"${pipeline_value}"
        
    active_custs = db.query(models.Customer).filter(models.Customer.status == "Active").count()
    
    metrics = [
        {
            "id": 1,
            "name": "Pipeline Value",
            "value": float(pipeline_value),
            "formatted_value": formatted_val,
            "trend": "+12.4% MoM",
            "is_positive": True
        },
        {
            "id": 2,
            "name": "Open Opportunities",
            "value": float(len(open_opps)),
            "formatted_value": str(len(open_opps)),
            "trend": "+6 this week",
            "is_positive": True
        },
        {
            "id": 3,
            "name": "Active Customers",
            "value": float(active_custs),
            "formatted_value": str(active_custs),
            "trend": "+3 net-new",
            "is_positive": True
        }
    ]
    
    stages_data = {
        "Leads": float(total_leads_val),
        "Opportunities": float(total_opps_val),
        "Quotations": float(total_quotes_val),
        "Sales Orders": float(total_orders_val),
        "Sales (Revenue)": float(sum(parse_numeric_value(s.value) for s in db.query(models.SalesOrder).all()))
    }
    
    colors = {
        "Leads": "#6366f1",
        "Opportunities": "#0ea5e9",
        "Quotations": "#14b8a6",
        "Sales Orders": "#f59e0b",
        "Sales (Revenue)": "#10b981"
    }
    
    pipeline_stages = []
    for idx, (stage_name, val) in enumerate(stages_data.items(), 1):
        pipeline_stages.append({
            "id": idx,
            "name": stage_name,
            "value": val,
            "color": colors.get(stage_name, "#94a3b8")
        })
        
    recommendations = crud.get_recommendations(db)
    
    return {
        "metrics": metrics,
        "pipeline_stages": pipeline_stages,
        "recommendations": recommendations
    }
