from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import database, models
from app.reports import schemas, crud
from app.core.router_utils import generic_summary

router = APIRouter(prefix="/api/reports", tags=["reports"])

def parse_numeric_value(val_str):
    if val_str is None:
        return 0.0
    val_str = str(val_str)
    clean_str = val_str.replace("₹", "").replace("$", "").replace(",", "").strip()
    try:
        return float(clean_str) if clean_str else 0.0
    except ValueError:
        return 0.0

@router.get("", response_model=schemas.ReportManagementData)
def get_reports_data(db: Session = Depends(database.get_db)):
    data = crud.get_reports(db)
    summary = generic_summary(data, active_vals=['Generating'], attention_vals=['Failed'])
    return {"summary": summary, "reports": data}

@router.get("/dashboard")
def get_reports_dashboard(db: Session = Depends(database.get_db)):
    sales = db.query(models.SalesOrder).all()
    rep_sales = {}
    for s in sales:
        rep_name = s.owner or "Unassigned"
        amount = parse_numeric_value(s.value)
        rep_sales[rep_name] = rep_sales.get(rep_name, 0.0) + amount
    
    leads = db.query(models.Lead).all()
    lead_status = {}
    for l in leads:
        status = l.status or "Unknown"
        lead_status[status] = lead_status.get(status, 0) + 1
        
    opps = db.query(models.Opportunity).all()
    opp_stages = {}
    for o in opps:
        stage = o.stage or "Unknown"
        opp_stages[stage] = opp_stages.get(stage, 0) + 1
        
    total_opps = len(opps)
    won_opps = len([o for o in opps if o.stage in ["Won", "PO Received"]])
    win_rate = (won_opps / total_opps * 100) if total_opps > 0 else 0.0
    
    total_leads = len(leads)
    converted_leads = len([l for l in leads if l.status == "Qualified"])
    lead_conv_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0.0

    return {
        "rep_sales": [{"rep": k, "amount": v} for k, v in rep_sales.items()],
        "lead_status": [{"status": k, "count": v} for k, v in lead_status.items()],
        "opp_stages": [{"stage": k, "count": v} for k, v in opp_stages.items()],
        "summary": {
            "win_rate": round(win_rate, 1),
            "lead_conv_rate": round(lead_conv_rate, 1),
            "total_sales_value": sum(rep_sales.values()),
            "total_opportunities": total_opps
        }
    }
