from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app import models, database
from app.dashboard import schemas, crud
from app.core.router_utils import parse_numeric_value
from app.core.deps import get_current_token_payload

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("", response_model=schemas.DashboardData)
async def get_dashboard_data(
    db: AsyncSession = Depends(database.get_db),
    payload: dict = Depends(get_current_token_payload),
):
    owner_id = payload.get("user_id")
    role = payload.get("role")
    is_owner = role in ["Organization Owner", "Admin"]

    stmt_leads = select(models.Lead).filter(models.Lead.status.in_(["New", "Qualified", "In Progress"]))
    if not is_owner and owner_id is not None:
        stmt_leads = stmt_leads.filter(or_(models.Lead.owner_id == owner_id, models.Lead.owner_id.is_(None)))
    open_leads_result = await db.execute(stmt_leads)
    open_leads = open_leads_result.scalars().all()

    stmt_opps = select(models.Opportunity).filter(models.Opportunity.stage.in_(
        ["Discovery", "Proposal", "Negotiation", "RFQ / Inquiry", "Technical Assessment", "Estimation & Quoting"]
    ))
    if not is_owner and owner_id is not None:
        stmt_opps = stmt_opps.filter(or_(models.Opportunity.owner_id == owner_id, models.Opportunity.owner_id.is_(None)))
    open_opps_result = await db.execute(stmt_opps)
    open_opps = open_opps_result.scalars().all()

    stmt_orders = select(models.SalesOrder).filter(models.SalesOrder.status.in_(["Pending", "Confirmed", "In Fulfillment"]))
    if not is_owner and owner_id is not None:
        stmt_orders = stmt_orders.filter(or_(models.SalesOrder.owner_id == owner_id, models.SalesOrder.owner_id.is_(None)))
    open_orders_result = await db.execute(stmt_orders)
    open_orders = open_orders_result.scalars().all()

    total_leads_val = sum(l.est_value for l in open_leads if l.est_value)
    total_opps_val = sum(parse_numeric_value(o.value) for o in open_opps)
    total_orders_val = sum(parse_numeric_value(so.value) for so in open_orders)

    pipeline_value = total_leads_val + total_opps_val + total_orders_val

    if pipeline_value >= 1_000_000:
        formatted_val = f"${pipeline_value / 1_000_000:.2f}M"
    elif pipeline_value >= 1_000:
        formatted_val = f"${pipeline_value / 1_000:.0f}K"
    else:
        formatted_val = f"${pipeline_value}"

    stmt_custs = select(func.count(models.Customer.id)).filter(models.Customer.status == "Active")
    if not is_owner and owner_id is not None:
        stmt_custs = stmt_custs.filter(or_(models.Customer.owner_id == owner_id, models.Customer.owner_id.is_(None)))
    active_custs_result = await db.execute(stmt_custs)
    active_custs = active_custs_result.scalar() or 0

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

    stmt_all_sales = select(models.SalesOrder)
    if not is_owner and owner_id is not None:
        stmt_all_sales = stmt_all_sales.filter(or_(models.SalesOrder.owner_id == owner_id, models.SalesOrder.owner_id.is_(None)))
    all_sales_result = await db.execute(stmt_all_sales)
    all_sales = all_sales_result.scalars().all()

    stages_data = {
        "Leads": float(total_leads_val),
        "Opportunities": float(total_opps_val),
        "Sales Orders": float(total_orders_val),
        "Sales (Revenue)": float(sum(parse_numeric_value(s.value) for s in all_sales))
    }

    colors = {
        "Leads": "#6366f1",
        "Opportunities": "#0ea5e9",
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

    recommendations = await crud.get_recommendations(db)

    return {
        "metrics": metrics,
        "pipeline_stages": pipeline_stages,
        "recommendations": recommendations
    }
