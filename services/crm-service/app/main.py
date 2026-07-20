from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app import models, database
from app.core.deps import get_current_token_payload

# Import feature routers
from app.dashboard.router import router as dashboard_router
from app.customers.router import router as customers_router
from app.contacts.router import router as contacts_router
from app.documents.router import router as documents_router
from app.leads.router import router as leads_router
from app.opportunities.router import router as opportunities_router

from app.requirements.router import router as requirements_router
from app.sales_orders.router import router as sales_orders_router

from app.reports.router import router as reports_router
from app.ai_assistant.router import router as ai_assistant_router
from app.lead_discovery.router import router as lead_discovery_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
    yield


app = FastAPI(title="CRM Dashboard API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency for CRM
crm_auth = [Depends(get_current_token_payload)]

# Register feature routers with authentication
app.include_router(dashboard_router, dependencies=crm_auth)
app.include_router(customers_router, dependencies=crm_auth)
app.include_router(contacts_router, dependencies=crm_auth)
app.include_router(documents_router, dependencies=crm_auth)
app.include_router(leads_router, dependencies=crm_auth)
app.include_router(opportunities_router, dependencies=crm_auth)
app.include_router(requirements_router, dependencies=crm_auth)
app.include_router(sales_orders_router, dependencies=crm_auth)

app.include_router(reports_router, dependencies=crm_auth)
app.include_router(ai_assistant_router, dependencies=crm_auth)
app.include_router(lead_discovery_router, dependencies=crm_auth)

# Dynamic Entity Mapping
ENTITY_MODEL_MAP = {
    "customers": models.Customer,
    "contacts": models.Contact,
    "documents": models.Document,
    "leads": models.Lead,
    "opportunities": models.Opportunity,

    "requirements": models.Requirement,
    "sales-orders": models.SalesOrder,

    "reports": models.Report,
    "ai-assistant": models.AIAssistantLog
}

PREFIX_MAP = {
    models.Customer: "CU",
    models.Contact: "CO",
    models.Document: "DO",
    models.Lead: "LD",
    models.Opportunity: "OP",

    models.Requirement: "RE",
    models.SalesOrder: "SO",

    models.Report: "RP",
    models.AIAssistantLog: "AI"
}


@app.get("/api/{entity_type}/fields")
async def get_entity_fields(entity_type: str, token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    from sqlalchemy.inspection import inspect
    mapper = inspect(model_class)

    fields = []
    for column in mapper.attrs:
        name = column.key
        if name in ["id", "id_str"]:
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
            elif entity_type == "sales-orders":
                options = ["Pending", "Confirmed", "Invoiced", "Paid", "Cancelled"]
        elif name == "tier" and entity_type == "customers":
            options = ["Platinum", "Gold", "Silver"]
        elif name == "type" and entity_type == "contacts":
            options = ["Primary", "Decision", "Influencer", "Inactive"]
        elif name == "category" and entity_type == "ai-assistant":
            options = ["Sales", "Support", "General"]
        label = name.replace("_", " ").title()
        if name == "owner":
            label = "Sales Representative"
        elif name == "account":
            label = "Company Name"

        fields.append({
            "name": name,
            "label": label,
            "type": input_type,
            "options": options
        })

    return fields


@app.post("/api/{entity_type}")
async def create_entity(entity_type: str, payload: dict, db: AsyncSession = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    prefix = PREFIX_MAP.get(model_class, "XX")

    count_result = await db.execute(select(func.count(model_class.id)))
    max_id = (count_result.scalar() or 0) + 1001
    id_str = f"{prefix}-{max_id}"

    payload["id_str"] = id_str
    payload.pop("id", None)

    db_obj = model_class(**payload)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    return db_obj


@app.put("/api/{entity_type}/{id_str}")
async def update_entity(entity_type: str, id_str: str, payload: dict, db: AsyncSession = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    result = await db.execute(select(model_class).filter(model_class.id_str == id_str))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    for key, value in payload.items():
        if key not in ["id", "id_str"]:
            setattr(db_obj, key, value)

    await db.commit()
    await db.refresh(db_obj)

    return db_obj


@app.delete("/api/{entity_type}/{id_str}")
async def delete_entity(entity_type: str, id_str: str, db: AsyncSession = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    result = await db.execute(select(model_class).filter(model_class.id_str == id_str))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    await db.delete(db_obj)
    await db.commit()
    return {"status": "success"}
