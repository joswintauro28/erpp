import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import Base, BaseRepository
from app.core.deps import get_db, get_current_org_id
from app.customer.models import Customer
from app.lead.models import Lead, Opportunity
from app.interaction.models import Enquiry, FollowUp, Task
from app.service.models import Complaint
from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead
from app.sales.models import Sale

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
async def get_dashboard_data(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(sa.select(Metric))
    metrics = list(result.scalars().all())

    result = await db.execute(sa.select(PipelineStage))
    pipeline_stages = list(result.scalars().all())

    result = await db.execute(sa.select(Recommendation))
    recommendations = list(result.scalars().all())

    result = await db.execute(sa.select(HotLead))
    hot_leads = list(result.scalars().all())

    result = await db.execute(sa.select(Customer).where(Customer.organization_id == user_id))
    customers = list(result.scalars().all())
    total_customers = len(customers)

    result = await db.execute(sa.select(Opportunity).where(Opportunity.organization_id == user_id))
    opportunities = list(result.scalars().all())
    pipeline_value = sum(int(o.value) for o in opportunities if o.value and o.value.isdigit())
    open_opportunities = len([o for o in opportunities if o.stage not in ("Closed Won", "Lost")])

    result = await db.execute(sa.select(Complaint).where(Complaint.organization_id == user_id))
    complaints = list(result.scalars().all())
    open_complaints = len([c for c in complaints if c.status in ("Open", "In Progress")])

    return {
        "metrics": metrics,
        "pipeline_stages": pipeline_stages,
        "recommendations": recommendations,
        "hot_leads": hot_leads,
        "total_customers": total_customers,
        "pipeline_value": pipeline_value,
        "open_opportunities": open_opportunities,
        "open_complaints": open_complaints,
    }


@router.get("/reports/dashboard")
async def get_reports_dashboard(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    result = await db.execute(
        sa.select(Opportunity).where(Opportunity.organization_id == user_id)
    )
    opportunities = list(result.scalars().all())
    total_opps = len(opportunities)
    won_opps = len([o for o in opportunities if o.stage == "Won"])
    win_rate = round((won_opps / total_opps * 100) if total_opps > 0 else 0, 1)
    open_opps = len([o for o in opportunities if o.stage not in ("Won", "Lost")])

    result = await db.execute(
        sa.select(Lead).where(Lead.organization_id == user_id)
    )
    leads = list(result.scalars().all())
    total_leads = len(leads)
    converted_leads = len([l for l in leads if l.status == "Converted"])
    conv_rate = round((converted_leads / total_leads * 100) if total_leads > 0 else 0, 1)

    result = await db.execute(sa.select(Sale))
    sales = list(result.scalars().all())
    total_sales = sum(int(s.amount) for s in sales if s.amount and s.amount.isdigit())

    rep_map: dict[str, int] = {}
    for s in sales:
        if s.rep and s.amount and s.amount.isdigit():
            rep_map[s.rep] = rep_map.get(s.rep, 0) + int(s.amount)
    rep_sales = [{"rep": k, "amount": v} for k, v in rep_map.items()]

    status_map: dict[str, int] = {}
    for l in leads:
        if l.status:
            status_map[l.status] = status_map.get(l.status, 0) + 1
    lead_status = [{"status": k, "count": v} for k, v in status_map.items()]

    stage_map: dict[str, int] = {}
    for o in opportunities:
        if o.stage:
            stage_map[o.stage] = stage_map.get(o.stage, 0) + 1
    opp_stages = [{"stage": k, "count": v} for k, v in stage_map.items()]

    return {
        "summary": {
            "win_rate": win_rate,
            "lead_conv_rate": conv_rate,
            "total_sales_value": total_sales,
            "total_opportunities": open_opps,
        },
        "rep_sales": rep_sales,
        "lead_status": lead_status,
        "opp_stages": opp_stages,
    }
