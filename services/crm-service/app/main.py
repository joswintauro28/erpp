from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app import models, database
from app.core.deps import get_current_token_payload
from app.core.idgen import next_document_id, next_customer_id

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
from app.lead_discovery.router import router as lead_discovery_router
from app.quotations.router import router as quotations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    async with database.engine.begin() as conn:
        await conn.run_sync(database.Base.metadata.create_all)
    from app.core.amqp import connect_amqp, disconnect_amqp
    from app.core.worker import run_crm_worker
    await connect_amqp()
    worker_task = asyncio.create_task(run_crm_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await disconnect_amqp()


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

# M22: CORS — specific origins instead of wildcard (required for credentials)
_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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
    "sales": models.Sale,

    "reports": models.Report
}

PREFIX_MAP = {
    models.Customer: "CUST",
    models.Contact: "CO",
    models.Document: "DO",
    models.Lead: "LD",
    models.Opportunity: "OP",

    models.Requirement: "RE",
    models.SalesOrder: "SO",
    models.Sale: "SA",

    models.Report: "RP"
}


@app.get("/api/{entity_type}/fields")
async def get_entity_fields(entity_type: str, token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    from sqlalchemy.inspection import inspect
    mapper = inspect(model_class)

    # Auto-computed / internal-link fields that the generic form should not expose
    hidden_field_names = {
        "score", "tier", "is_mql", "mql_qualified_at",
        "credit_check_status", "credit_check_detail",
        "approval_status", "approved_at",
        "stage_history", "lead_id_str", "opportunity_id_str",
    }

    fields = []
    for column in mapper.attrs:
        name = column.key
        if name in ["id", "id_str"] or name in hidden_field_names:
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
                options = ["Pending", "Confirmed", "Approved", "Invoiced", "Paid", "Cancelled", "Hold", "Stock Hold"]
            elif entity_type == "sales":
                options = ["Pending", "Paid", "Invoiced", "Delivered", "Cancelled"]
        elif name == "tier" and entity_type == "customers":
            options = ["Platinum", "Gold", "Silver"]
        elif name == "type" and entity_type == "contacts":
            options = ["Primary", "Decision", "Influencer", "Inactive"]

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

    if prefix == "CUST":
        id_str = await next_customer_id(db, model_class)
    else:
        id_str = await next_document_id(db, model_class, prefix)

    from sqlalchemy.inspection import inspect
    from sqlalchemy import String, Integer, Float, Boolean
    mapper = inspect(model_class)
    
    filtered_payload = {}
    for k, v in payload.items():
        if k in mapper.columns:
            col_type = mapper.columns[k].type
            if v is None:
                filtered_payload[k] = None
            elif isinstance(col_type, String):
                filtered_payload[k] = str(v)
            elif isinstance(col_type, Integer):
                try:
                    filtered_payload[k] = int(v) if v != "" else None
                except (ValueError, TypeError):
                    filtered_payload[k] = v
            elif isinstance(col_type, Float):
                try:
                    filtered_payload[k] = float(v) if v != "" else None
                except (ValueError, TypeError):
                    filtered_payload[k] = v
            elif isinstance(col_type, Boolean):
                if isinstance(v, str):
                    filtered_payload[k] = v.lower() in ("true", "1", "yes")
                else:
                    filtered_payload[k] = bool(v)
            else:
                filtered_payload[k] = v

    filtered_payload["id_str"] = id_str
    filtered_payload.pop("id", None)

    owner_id = token_payload.get("user_id")
    if owner_id is not None and "owner_id" not in filtered_payload:
        filtered_payload["owner_id"] = owner_id

    db_obj = model_class(**filtered_payload)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Leads created through the generic CRUD get their score/tier/MQL flags
    # computed and persisted automatically (M3/M4).
    if entity_type == "leads":
        from app.leads.scoring import apply_lead_score
        apply_lead_score(db_obj)
        await db.commit()
        await db.refresh(db_obj)

    # Sales orders created through the generic CRUD must still start the
    # approval pipeline (credit check -> stock check -> publish to inventory).
    if entity_type == "sales-orders":
        if not getattr(db_obj, "so_no", None):
            db_obj.so_no = id_str
            await db.commit()
            await db.refresh(db_obj)
        from app.sales_orders.pipeline import SO_APPROVED_STATUSES, finalize_approved_sales_order
        if getattr(db_obj, "status", None) in SO_APPROVED_STATUSES:
            await finalize_approved_sales_order(db, db_obj, token_payload)

    return db_obj


@app.put("/api/{entity_type}/{id_str}")
async def update_entity(entity_type: str, id_str: str, payload: dict, db: AsyncSession = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    owner_id = token_payload.get("user_id")
    stmt = select(model_class).filter(model_class.id_str == id_str)
    if owner_id is not None:
        stmt = stmt.filter(model_class.owner_id == owner_id)
    result = await db.execute(stmt)
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    old_status = getattr(db_obj, "status", None)

    from sqlalchemy.inspection import inspect
    from sqlalchemy import String, Integer, Float, Boolean
    mapper = inspect(model_class)

    for key, value in payload.items():
        if key in mapper.columns and key not in ["id", "id_str"]:
            col_type = mapper.columns[key].type
            if value is None:
                setattr(db_obj, key, None)
            elif isinstance(col_type, String):
                setattr(db_obj, key, str(value))
            elif isinstance(col_type, Integer):
                try:
                    setattr(db_obj, key, int(value) if value != "" else None)
                except (ValueError, TypeError):
                    setattr(db_obj, key, value)
            elif isinstance(col_type, Float):
                try:
                    setattr(db_obj, key, float(value) if value != "" else None)
                except (ValueError, TypeError):
                    setattr(db_obj, key, value)
            elif isinstance(col_type, Boolean):
                if isinstance(value, str):
                    setattr(db_obj, key, value.lower() in ("true", "1", "yes"))
                else:
                    setattr(db_obj, key, bool(value))
            else:
                setattr(db_obj, key, value)

    await db.commit()
    await db.refresh(db_obj)

    # Leads updated through the generic CRUD get their score recomputed.
    if entity_type == "leads":
        from app.leads.scoring import apply_lead_score
        apply_lead_score(db_obj)
        await db.commit()
        await db.refresh(db_obj)

    # Sales orders updated through the generic CRUD must still trigger the
    # approval / cancellation lifecycle events.
    if entity_type == "sales-orders":
        from app.sales_orders.pipeline import (
            SO_APPROVED_STATUSES,
            finalize_approved_sales_order,
            publish_sales_order_cancelled,
        )
        new_status = getattr(db_obj, "status", None)
        if new_status == "Cancelled" and old_status != "Cancelled":
            await publish_sales_order_cancelled(token_payload, db_obj)
        elif new_status in SO_APPROVED_STATUSES and old_status not in SO_APPROVED_STATUSES:
            await finalize_approved_sales_order(db, db_obj, token_payload)

    return db_obj


@app.delete("/api/{entity_type}/{id_str}")
async def delete_entity(entity_type: str, id_str: str, db: AsyncSession = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")

    model_class = ENTITY_MODEL_MAP[entity_type]
    owner_id = token_payload.get("user_id")
    stmt = select(model_class).filter(model_class.id_str == id_str)
    if owner_id is not None:
        stmt = stmt.filter(model_class.owner_id == owner_id)
    result = await db.execute(stmt)
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")

    await db.delete(db_obj)
    await db.commit()
    return {"status": "success"}
