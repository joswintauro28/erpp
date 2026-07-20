from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app import models, database
from app.core.deps import get_current_token_payload, require_permission

# Import feature routers
from app.dashboard.router import router as dashboard_router
from app.customers.router import router as customers_router
from app.contacts.router import router as contacts_router
from app.documents.router import router as documents_router
from app.leads.router import router as leads_router
from app.opportunities.router import router as opportunities_router

from app.requirements.router import router as requirements_router
from app.quotations.router import router as quotations_router
from app.sales_orders.router import router as sales_orders_router

from app.reports.router import router as reports_router
from app.ai_assistant.router import router as ai_assistant_router
from app.users.router import router as users_router
from app.lead_discovery.router import router as lead_discovery_router

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="CRM Dashboard API")

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
app.include_router(quotations_router, dependencies=crm_auth)
app.include_router(sales_orders_router, dependencies=crm_auth)

app.include_router(reports_router, dependencies=crm_auth)
app.include_router(ai_assistant_router, dependencies=crm_auth)
app.include_router(users_router, dependencies=crm_auth)
app.include_router(lead_discovery_router, dependencies=crm_auth)

@app.on_event("startup")
def startup_event():
    database.Base.metadata.create_all(bind=database.engine)

# Dynamic Entity Mapping
ENTITY_MODEL_MAP = {
    "customers": models.Customer,
    "contacts": models.Contact,
    "documents": models.Document,
    "leads": models.Lead,
    "opportunities": models.Opportunity,

    "requirements": models.Requirement,
    "quotations": models.Quotation,
    "sales-orders": models.SalesOrder,

    "reports": models.Report,
    "ai-assistant": models.AIAssistantLog,
    "users": models.User
}

@app.get("/api/{entity_type}/fields")
def get_entity_fields(entity_type: str, token_payload: dict = Depends(get_current_token_payload)):
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
            elif entity_type == "quotations":
                options = ["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Expired"]
            elif entity_type == "sales-orders":
                options = ["Pending", "Confirmed", "Invoiced", "Paid", "Cancelled"]
            elif entity_type == "users":
                options = ["Active", "Suspended"]
        elif name == "tier" and entity_type == "customers":
            options = ["Platinum", "Gold", "Silver"]
        elif name == "role" and entity_type == "users":
            options = ["Admin", "Employee"]
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

def handle_quotation_accepted(db_obj, db: Session):
    existing_so = db.query(models.SalesOrder).filter(models.SalesOrder.from_quote == db_obj.quote_no).first()
    if not existing_so:
        import datetime
        today = datetime.date.today()
        eta = today + datetime.timedelta(days=14)
        
        max_id = db.query(models.SalesOrder).count() + 1001
        new_so = models.SalesOrder(
            id_str=f"SO-{max_id}",
            so_no=f"SO-{db_obj.quote_no.split('-')[-1] if '-' in db_obj.quote_no else db_obj.quote_no}",
            account=db_obj.account,
            from_quote=db_obj.quote_no,
            value=db_obj.value,
            eta=eta.strftime("%Y-%m-%d"),
            date_ordered=today.strftime("%Y-%m-%d"),
            status="Pending",
            owner=db_obj.owner or "System",
            file_data=getattr(db_obj, "file_data", None),
            file_name=getattr(db_obj, "file_name", None)
        )
        db.add(new_so)
        db.commit()
    else:
        existing_so.account = db_obj.account
        existing_so.value = db_obj.value
        existing_so.owner = db_obj.owner or "System"
        existing_so.file_data = getattr(db_obj, "file_data", None)
        existing_so.file_name = getattr(db_obj, "file_name", None)
        db.commit()

@app.post("/api/{entity_type}")
def create_entity(entity_type: str, payload: dict, db: Session = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    prefix_map = {
        models.Customer: "CU",
        models.Contact: "CO",
        models.Document: "DO",
        models.Lead: "LD",
        models.Opportunity: "OP",

        models.Requirement: "RE",
        models.Quotation: "QU",
        models.SalesOrder: "SO",

        models.Report: "RP",
        models.AIAssistantLog: "AI",
        models.User: "US"
    }
    
    prefix = prefix_map.get(model_class, "XX")
    max_id = db.query(model_class).count() + 1001
    id_str = f"{prefix}-{max_id}"
    
    payload["id_str"] = id_str
    payload.pop("id", None)
    
    db_obj = model_class(**payload)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    if entity_type == "quotations" and db_obj.status == "Accepted":
        handle_quotation_accepted(db_obj, db)
        
    return db_obj

@app.put("/api/{entity_type}/{id_str}")
def update_entity(entity_type: str, id_str: str, payload: dict, db: Session = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    db_obj = db.query(model_class).filter(model_class.id_str == id_str).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    old_status = getattr(db_obj, "status", None)
    
    for key, value in payload.items():
        if key not in ["id", "id_str"]:
            setattr(db_obj, key, value)
            
    db.commit()
    db.refresh(db_obj)
    
    if entity_type == "quotations" and db_obj.status == "Accepted":
        handle_quotation_accepted(db_obj, db)
        
    return db_obj

@app.delete("/api/{entity_type}/{id_str}")
def delete_entity(entity_type: str, id_str: str, db: Session = Depends(database.get_db), token_payload: dict = Depends(get_current_token_payload)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    db_obj = db.query(model_class).filter(model_class.id_str == id_str).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    db.delete(db_obj)
    db.commit()
    return {"status": "success"}
