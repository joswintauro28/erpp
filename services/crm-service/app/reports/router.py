from fastapi import APIRouter, Depends
from sqlalchemy import select
from app import database, models
from app.reports import schemas, crud
from app.core.router_utils import generic_summary, parse_numeric_value
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("", response_model=schemas.ReportManagementData)
async def get_reports_data(
    db=Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    data = await crud.get_reports(db, owner_id=owner_id)
    summary = generic_summary(data, active_vals=['Generating'], attention_vals=['Failed'])
    return {"summary": summary, "reports": data}

@router.get("/dashboard")
async def get_reports_dashboard(
    db=Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")

    stmt_so = select(models.SalesOrder)
    if owner_id is not None:
        stmt_so = stmt_so.filter(models.SalesOrder.owner_id == owner_id)
    result = await db.execute(stmt_so)
    sales = result.scalars().all()
    rep_sales = {}
    for s in sales:
        rep_name = s.owner or "Unassigned"
        amount = parse_numeric_value(s.value)
        rep_sales[rep_name] = rep_sales.get(rep_name, 0.0) + amount

    stmt_lead = select(models.Lead)
    if owner_id is not None:
        stmt_lead = stmt_lead.filter(models.Lead.owner_id == owner_id)
    result = await db.execute(stmt_lead)
    leads = result.scalars().all()
    lead_status = {}
    for l in leads:
        status = l.status or "Unknown"
        lead_status[status] = lead_status.get(status, 0) + 1

    stmt_opp = select(models.Opportunity)
    if owner_id is not None:
        stmt_opp = stmt_opp.filter(models.Opportunity.owner_id == owner_id)
    result = await db.execute(stmt_opp)
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
