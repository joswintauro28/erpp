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
from app.quotations.router import router as quotations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
    yield


from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="DATAVEX CRM Service API",
    description="Sales Pipeline Engine, Customer Registry, Lead Discovery & AI Assistant for DATAVEX ERP.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="DATAVEX CRM Service API",
        version="1.0.0",
        description="Sales Pipeline Engine, Customer Registry, Lead Discovery & AI Assistant for DATAVEX ERP.",
        routes=app.routes,
    )
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT Bearer token issued by Core IAM SSO",
        }
    }
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy"}

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
app.include_router(quotations_router, dependencies=crm_auth)

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

    from sqlalchemy.inspection import inspect
    from sqlalchemy import String
    mapper = inspect(model_class)
    
    filtered_payload = {}
    for k, v in payload.items():
        if k in mapper.columns:
            col_type = mapper.columns[k].type
            if isinstance(col_type, String) and v is not None:
                filtered_payload[k] = str(v)
            else:
                filtered_payload[k] = v

    filtered_payload["id_str"] = id_str
    filtered_payload.pop("id", None)

    db_obj = model_class(**filtered_payload)
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

    from sqlalchemy.inspection import inspect
    from sqlalchemy import String
    mapper = inspect(model_class)

    for key, value in payload.items():
        if key in mapper.columns and key not in ["id", "id_str"]:
            col_type = mapper.columns[key].type
            if isinstance(col_type, String) and value is not None:
                setattr(db_obj, key, str(value))
            else:
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
