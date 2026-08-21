from fastapi import APIRouter, Depends
from sqlalchemy import select
from app import database, models
from app.reports import schemas, crud
from app.core.router_utils import generic_summary, parse_numeric_value

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("", response_model=schemas.ReportManagementData)
async def get_reports_data(db=Depends(database.get_db)):
    data = await crud.get_reports(db)
    summary = generic_summary(data, active_vals=['Generating'], attention_vals=['Failed'])
    return {"summary": summary, "reports": data}

@router.get("/dashboard")
async def get_reports_dashboard(db=Depends(database.get_db)):
    result = await db.execute(select(models.SalesOrder))
    sales = result.scalars().all()
    rep_sales = {}
    for s in sales:
        rep_name = s.owner or "Unassigned"
        amount = parse_numeric_value(s.value)
        rep_sales[rep_name] = rep_sales.get(rep_name, 0.0) + amount
    
    result = await db.execute(select(models.Lead))
    leads = result.scalars().all()
    lead_status = {}
    for l in leads:
        status = l.status or "Unknown"
        lead_status[status] = lead_status.get(status, 0) + 1
        
    result = await db.execute(select(models.Opportunity))
    opps = result.scalars().all()
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
