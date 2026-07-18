import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect

from app.core.deps import get_db, get_current_org_id, get_current_token_payload

from app.customer.models import Customer, Contact, Document
from app.lead.models import Lead, Opportunity
from app.sales.models import Sale, Requirement, Quotation, SalesOrder
from app.interaction.models import Enquiry, SiteVisit, FollowUp, Task, Communication, VisitPlan
from app.service.models import Complaint, Feedback
from app.ai.models import AIAssistantLog
from app.dashboard.models import Metric, PipelineStage, Recommendation, HotLead, Report
from app.core.billing_client import push_sales_invoice_to_billing

router = APIRouter(prefix="/api", tags=["generic"])

ENTITY_MODEL_MAP = {
    "customers": Customer,
    "contacts": Contact,
    "documents": Document,
    "leads": Lead,
    "opportunities": Opportunity,
    "sales": Sale,
    "requirements": Requirement,
    "quotations": Quotation,
    "sales-orders": SalesOrder,
    "enquiries": Enquiry,
    "site-visits": SiteVisit,
    "follow-ups": FollowUp,
    "tasks": Task,
    "communications": Communication,
    "visit-plans": VisitPlan,
    "complaints": Complaint,
    "feedback": Feedback,
    "reports": Report,
    "ai-assistant": AIAssistantLog,
}


@router.get("/{entity_type}/fields")
async def get_entity_fields(
    entity_type: str,
    user_id: int = Depends(get_current_org_id),
):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    mapper = inspect(model_class)

    fields = []
    for column in mapper.attrs:
        name = column.key
        if name in ("id", "id_str", "organization_id"):
            continue

        sql_type = str(column.columns[0].type).lower()
        input_type = "text"
        if "integer" in sql_type:
            input_type = "number"
        elif "float" in sql_type or "numeric" in sql_type:
            input_type = "number"

        options = None
        if name == "status":
            if entity_type == "customers":
                options = ["Active", "Prospect", "Dormant", "Churned"]
            elif entity_type == "documents":
                options = ["Draft", "Under Review", "Signed", "Expired"]
            elif entity_type == "leads":
                options = ["New", "Qualified", "In Progress", "Converted", "Lost"]
            elif entity_type == "opportunities":
                options = ["Discovery", "Proposal", "Negotiation", "Won", "Lost"]
            elif entity_type == "enquiries":
                options = ["New", "Replied", "Closed"]
            elif entity_type == "quotations":
                options = ["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Expired"]
            elif entity_type == "sales-orders":
                options = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"]
            elif entity_type in ("site-visits", "follow-ups", "tasks", "visit-plans"):
                options = ["Scheduled", "Completed", "Cancelled"]
            elif entity_type == "complaints":
                options = ["Open", "In Progress", "Resolved"]
        elif name == "tier" and entity_type == "customers":
            options = ["Platinum", "Gold", "Silver"]
        elif name == "type" and entity_type == "contacts":
            options = ["Primary", "Decision", "Influencer", "Inactive"]
        elif name == "category" and entity_type == "ai-assistant":
            options = ["Sales", "Support", "General"]

        label = name.replace("_", " ").title()
        if name == "account":
            label = "Company Name"

        fields.append({
            "name": name,
            "label": label,
            "type": input_type,
            "options": options,
        })

    return fields


@router.post("/{entity_type}")
async def create_entity(
    entity_type: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    prefix_map = {
        Customer: "CU",
        Contact: "CO",
        Document: "DO",
        Lead: "LD",
        Opportunity: "OP",
        Sale: "SA",
        Requirement: "RE",
        Quotation: "QU",
        SalesOrder: "SO",
        Enquiry: "EN",
        SiteVisit: "SV",
        FollowUp: "FU",
        Task: "TA",
        Communication: "CM",
        VisitPlan: "VP",
        Complaint: "CP",
        Feedback: "FB",
        AIAssistantLog: "AI",
    }

    prefix = prefix_map.get(model_class, "XX")
    count_result = await db.execute(sa.select(sa.func.count()).select_from(model_class))
    max_id = count_result.scalar() + 1001
    id_str = f"{prefix}-{max_id}"

    payload["id_str"] = id_str
    payload.pop("id", None)
    payload["organization_id"] = user_id

    db_obj = model_class(**payload)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    if entity_type == "sales-orders" and payload.get("status") == "Confirmed":
        so_dict = {
            "account": getattr(db_obj, "account", ""),
            "so_no": getattr(db_obj, "so_no", ""),
            "value": getattr(db_obj, "value", "0"),
            "id_str": getattr(db_obj, "id_str", ""),
        }
        raw_token = token_payload.get("_raw_token", "")
        try:
            await push_sales_invoice_to_billing(raw_token, user_id, so_dict)
        except Exception:
            pass

    return db_obj


@router.put("/{entity_type}/{id_str}")
async def update_entity(
    entity_type: str,
    id_str: str,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
    token_payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    result = await db.execute(sa.select(model_class).where(model_class.id_str == id_str))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    old_status = getattr(db_obj, "status", None)

    for key, value in payload.items():
        if key not in ("id", "id_str", "organization_id"):
            setattr(db_obj, key, value)

    await db.commit()
    await db.refresh(db_obj)

    if entity_type == "sales-orders" and payload.get("status") == "Confirmed" and old_status != "Confirmed":
        so_dict = {
            "account": getattr(db_obj, "account", ""),
            "so_no": getattr(db_obj, "so_no", ""),
            "value": getattr(db_obj, "value", "0"),
            "id_str": getattr(db_obj, "id_str", ""),
        }
        raw_token = token_payload.get("_raw_token", "")
        try:
            await push_sales_invoice_to_billing(raw_token, user_id, so_dict)
        except Exception:
            pass

    return db_obj


@router.delete("/{entity_type}/{id_str}")
async def delete_entity(
    entity_type: str,
    id_str: str,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_org_id),
):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    result = await db.execute(sa.select(model_class).where(model_class.id_str == id_str))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    await db.delete(db_obj)
    await db.commit()
    return {"status": "success"}
