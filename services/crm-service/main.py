from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, crud, database

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="CRM Dashboard API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"], # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_numeric_value(val_str):
    if val_str is None:
        return 0.0
    val_str = str(val_str)
    clean_str = val_str.replace("₹", "").replace("$", "").replace(",", "").strip()
    try:
        return float(clean_str) if clean_str else 0.0
    except ValueError:
        return 0.0

@app.get("/api/dashboard", response_model=schemas.DashboardData)
def get_dashboard_data(db: Session = Depends(database.get_db)):
    # 1. Pipeline Value: Sum of all open Leads, Opportunities, Quotations, and Sales Orders
    open_leads = db.query(models.Lead).filter(models.Lead.status.in_(["New", "Qualified", "In Progress"])).all()
    open_opps = db.query(models.Opportunity).filter(models.Opportunity.stage.in_(["Discovery", "Proposal", "Negotiation", "RFQ / Inquiry", "Technical Assessment", "Estimation & Quoting"])).all()
    open_quotes = db.query(models.Quotation).filter(models.Quotation.status.in_(["Draft", "Sent", "Under Review"])).all()
    open_orders = db.query(models.SalesOrder).filter(models.SalesOrder.status.in_(["Pending", "Confirmed", "In Fulfillment"])).all()
    
    total_leads_val = sum(l.est_value for l in open_leads if l.est_value)
    total_opps_val = sum(parse_numeric_value(o.value) for o in open_opps)
    total_quotes_val = sum(parse_numeric_value(q.value) for q in open_quotes)
    total_orders_val = sum(parse_numeric_value(so.value) for so in open_orders)
    
    pipeline_value = total_leads_val + total_opps_val + total_quotes_val + total_orders_val
    
    if pipeline_value >= 1_000_000:
        formatted_val = f"${pipeline_value / 1_000_000:.2f}M"
    elif pipeline_value >= 1_000:
        formatted_val = f"${pipeline_value / 1_000:.0f}K"
    else:
        formatted_val = f"${pipeline_value}"
        
    # 2. Active Customers
    active_custs = db.query(models.Customer).filter(models.Customer.status == "Active").count()
    
    # 3. Open Complaints
    open_complaints = db.query(models.Complaint).filter(models.Complaint.status.in_(["Open", "Investigating"])).count()
    
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
        },
        {
            "id": 4,
            "name": "Open Complaints",
            "value": float(open_complaints),
            "formatted_value": str(open_complaints),
            "trend": "2 breaching SLA",
            "is_positive": False
        }
    ]
    
    # 4. Pipeline Stages
    stages_data = {
        "Leads": float(total_leads_val),
        "Opportunities": float(total_opps_val),
        "Quotations": float(total_quotes_val),
        "Sales Orders": float(total_orders_val),
        "Sales (Revenue)": float(sum(parse_numeric_value(s.amount) for s in db.query(models.Sale).all()))
    }
    
    colors = {
        "Leads": "#6366f1",
        "Opportunities": "#0ea5e9",
        "Quotations": "#14b8a6",
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
        
    recommendations = crud.get_recommendations(db)
    
    return {
        "metrics": metrics,
        "pipeline_stages": pipeline_stages,
        "recommendations": recommendations
    }

@app.get("/api/customers", response_model=schemas.CustomerManagementData)
def get_customers_data(db: Session = Depends(database.get_db)):
    customers = crud.get_customers(db)
    
    # Calculate summary based on current customers
    total = len(customers)
    open_count = len([c for c in customers if c.status in ['Active', 'Prospect']])
    at_risk = len([c for c in customers if c.status in ['Dormant', 'Churned']])
    owners_count = len(set(c.owner for c in customers))
    
    summary = {
        "total_customers": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "customers": customers
    }

@app.get("/api/contacts", response_model=schemas.ContactManagementData)
def get_contacts_data(db: Session = Depends(database.get_db)):
    contacts = crud.get_contacts(db)
    
    total = len(contacts)
    open_count = len([c for c in contacts if c.type in ['Primary', 'Decision']])
    at_risk = len([c for c in contacts if c.type in ['Inactive']])
    owners_count = 5 # hardcoded to match UI for now since owners aren't strictly on contacts
    
    summary = {
        "total_contacts": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "contacts": contacts
    }

@app.get("/api/documents", response_model=schemas.DocumentManagementData)
def get_documents_data(db: Session = Depends(database.get_db)):
    documents = crud.get_documents(db)
    
    total = len(documents)
    open_count = len([d for d in documents if d.status in ['Draft', 'Under Review']])
    at_risk = len([d for d in documents if d.status == 'Expired'])
    owners_count = len(set(d.owner for d in documents if d.owner)) or 1
    
    summary = {
        "total_documents": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "documents": documents
    }


@app.get("/api/leads", response_model=schemas.LeadManagementData)
def get_leads_data(db: Session = Depends(database.get_db)):
    leads = crud.get_leads(db)
    
    total = len(leads)
    open_count = len([l for l in leads if l.status in ['New', 'Qualified', 'In Progress']])
    at_risk = len([l for l in leads if l.status == 'Lost'])
    owners_count = len(set(l.owner for l in leads if l.owner)) or 1
    
    summary = {
        "total_leads": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "leads": leads
    }

@app.get("/api/opportunities", response_model=schemas.OpportunityManagementData)
def get_opportunities_data(db: Session = Depends(database.get_db)):
    opportunities = crud.get_opportunities(db)
    
    total = len(opportunities)
    open_count = len([o for o in opportunities if o.stage in ['Discovery', 'Proposal', 'Negotiation']])
    at_risk = len([o for o in opportunities if o.stage == 'Lost'])
    owners_count = len(set(o.owner for o in opportunities if o.owner)) or 1
    
    summary = {
        "total_opportunities": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "opportunities": opportunities
    }

@app.get("/api/sales", response_model=schemas.SaleManagementData)
def get_sales_data(db: Session = Depends(database.get_db)):
    sales = crud.get_sales(db)
    
    total = len(sales)
    open_count = len([s for s in sales if s.status in ['Draft', 'Invoiced', 'Confirmed']])
    at_risk = len([s for s in sales if s.status == 'Overdue'])
    owners_count = len(set(s.rep for s in sales if s.rep)) or 1
    
    summary = {
        "total_sales": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "sales": sales
    }

@app.get("/api/requirements", response_model=schemas.RequirementManagementData)
def get_requirements_data(db: Session = Depends(database.get_db)):
    requirements = crud.get_requirements(db)
    
    total = len(requirements)
    open_count = len([r for r in requirements if r.status in ['Draft', 'Review']])
    at_risk = len([r for r in requirements if r.status == 'Cancelled'])
    owners_count = len(set(r.owner for r in requirements if r.owner)) or 1
    
    summary = {
        "total_requirements": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "requirements": requirements
    }

@app.get("/api/quotations", response_model=schemas.QuotationManagementData)
def get_quotations_data(db: Session = Depends(database.get_db)):
    quotations = crud.get_quotations(db)
    
    total = len(quotations)
    open_count = len([q for q in quotations if q.status in ['Draft', 'Sent', 'Under Review']])
    at_risk = len([q for q in quotations if q.status == 'Expired'])
    owners_count = len(set(q.owner for q in quotations if q.owner)) or 1
    
    summary = {
        "total_quotations": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "quotations": quotations
    }

@app.get("/api/sales-orders", response_model=schemas.SalesOrderManagementData)
def get_sales_orders_data(db: Session = Depends(database.get_db)):
    sales_orders = crud.get_sales_orders(db)
    
    total = len(sales_orders)
    open_count = len([so for so in sales_orders if so.status in ['Pending', 'Confirmed']])
    at_risk = len([so for so in sales_orders if so.status == 'Cancelled'])
    owners_count = len(set(so.owner for so in sales_orders if so.owner)) or 1
    
    summary = {
        "total_orders": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "sales_orders": sales_orders
    }

# --- Engagement Endpoints ---

def generic_summary(data, status_field='status', active_vals=None, attention_vals=None):
    total = len(data)
    active = len([d for d in data if getattr(d, status_field, '') in (active_vals or [])])
    attention = len([d for d in data if getattr(d, status_field, '') in (attention_vals or [])])
    
    # Dynamically calculate unique owners
    unique_owners = set()
    for d in data:
        owner = getattr(d, 'owner', None)
        if not owner:
            owner = getattr(d, 'rep', None) # Sale uses rep
        if owner:
            unique_owners.add(owner)
            
    owners = len(unique_owners)
    
    return {"total": total, "active": active, "attention": attention, "owners": owners}

@app.on_event("startup")
def startup_event():
    database.Base.metadata.create_all(bind=database.engine)
    # Database is initialized but we no longer seed hardcoded data.

@app.get("/api/enquiries", response_model=schemas.EnquiryManagementData)
def get_enquiries_data(db: Session = Depends(database.get_db)):
    data = crud.get_enquiries(db)
    summary = generic_summary(data, active_vals=['Open'], attention_vals=[])
    return {"summary": summary, "enquiries": data}

@app.get("/api/site-visits", response_model=schemas.SiteVisitManagementData)
def get_site_visits_data(db: Session = Depends(database.get_db)):
    data = crud.get_site_visits(db)
    summary = generic_summary(data, active_vals=['Scheduled'], attention_vals=[])
    return {"summary": summary, "site_visits": data}

@app.get("/api/follow-ups", response_model=schemas.FollowUpManagementData)
def get_follow_ups_data(db: Session = Depends(database.get_db)):
    data = crud.get_follow_ups(db)
    summary = generic_summary(data, active_vals=['Pending'], attention_vals=[])
    return {"summary": summary, "follow_ups": data}

@app.get("/api/tasks", response_model=schemas.TaskManagementData)
def get_tasks_data(db: Session = Depends(database.get_db)):
    data = crud.get_tasks(db)
    summary = generic_summary(data, active_vals=['In Progress'], attention_vals=[])
    return {"summary": summary, "tasks": data}

@app.get("/api/communications", response_model=schemas.CommunicationManagementData)
def get_communications_data(db: Session = Depends(database.get_db)):
    data = crud.get_communications(db)
    summary = generic_summary(data)
    return {"summary": summary, "communications": data}

@app.get("/api/visit-plans", response_model=schemas.VisitPlanManagementData)
def get_visit_plans_data(db: Session = Depends(database.get_db)):
    data = crud.get_visit_plans(db)
    summary = generic_summary(data, active_vals=['Confirmed'], attention_vals=[])
    return {"summary": summary, "visit_plans": data}

@app.get("/api/complaints", response_model=schemas.ComplaintManagementData)
def get_complaints_data(db: Session = Depends(database.get_db)):
    data = crud.get_complaints(db)
    summary = generic_summary(data, active_vals=['Investigating'], attention_vals=[])
    return {"summary": summary, "complaints": data}

@app.get("/api/feedback", response_model=schemas.FeedbackManagementData)
def get_feedback_data(db: Session = Depends(database.get_db)):
    data = crud.get_feedback(db)
    summary = generic_summary(data)
    return {"summary": summary, "feedback": data}

# --- Insights Endpoints ---

@app.get("/api/reports", response_model=schemas.ReportManagementData)
def get_reports_data(db: Session = Depends(database.get_db)):
    data = crud.get_reports(db)
    summary = generic_summary(data, active_vals=['Generating'], attention_vals=['Failed'])
    return {"summary": summary, "reports": data}

@app.get("/api/ai-assistant", response_model=schemas.AIAssistantManagementData)
def get_ai_logs_data(db: Session = Depends(database.get_db)):
    data = crud.get_ai_logs(db)
    summary = generic_summary(data, active_vals=['Success'], attention_vals=['Failed'])
    return {"summary": summary, "ai_logs": data}

@app.get("/api/admins", response_model=schemas.AdminManagementData)
def get_admins_data(db: Session = Depends(database.get_db)):
    data = crud.get_admins(db)
    summary = generic_summary(data, active_vals=['Active'], attention_vals=['Suspended'])
    return {"summary": summary, "admins": data}

from datetime import datetime
from fastapi import HTTPException
@app.post("/api/admin/login")
def admin_login(login_data: schemas.AdminLogin, db: Session = Depends(database.get_db)):
    admin = db.query(models.Admin).filter(models.Admin.email == login_data.email).first()
    if not admin or admin.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if admin.role not in ["Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Administrator role required.")
    
    admin.last_login = datetime.now().strftime("%b %d %I:%M %p")
    db.commit()
    db.refresh(admin)
    return {"status": "success", "user": {"id": admin.id_str, "name": admin.name, "email": admin.email, "role": admin.role}}

@app.post("/api/employee/login")
def employee_login(login_data: schemas.AdminLogin, db: Session = Depends(database.get_db)):
    employee = db.query(models.Admin).filter(models.Admin.email == login_data.email).first()
    if not employee or employee.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if employee.role != "Employee":
        raise HTTPException(status_code=403, detail="Access denied. Employee role required.")
    if employee.status != "Active":
        raise HTTPException(status_code=403, detail="Account is suspended or inactive")
        
    employee.last_login = datetime.now().strftime("%b %d %I:%M %p")
    db.commit()
    db.refresh(employee)
    return {"status": "success", "user": {"id": employee.id_str, "name": employee.name, "email": employee.email, "role": employee.role}}

# Dynamic Entity Mapping
ENTITY_MODEL_MAP = {
    "customers": models.Customer,
    "contacts": models.Contact,
    "documents": models.Document,
    "leads": models.Lead,
    "opportunities": models.Opportunity,
    "sales": models.Sale,
    "requirements": models.Requirement,
    "quotations": models.Quotation,
    "sales-orders": models.SalesOrder,
    "enquiries": models.Enquiry,
    "site-visits": models.SiteVisit,
    "follow-ups": models.FollowUp,
    "tasks": models.Task,
    "communications": models.Communication,
    "visit-plans": models.VisitPlan,
    "complaints": models.Complaint,
    "feedback": models.Feedback,
    "reports": models.Report,
    "ai-assistant": models.AIAssistantLog,
    "admins": models.Admin
}

@app.get("/api/{entity_type}/fields")
def get_entity_fields(entity_type: str):
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
            elif entity_type == "enquiries":
                options = ["New", "Replied", "Closed"]
            elif entity_type == "quotations":
                options = ["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Expired"]
            elif entity_type == "sales-orders":
                options = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"]
            elif entity_type in ["site-visits", "follow-ups", "tasks", "visit-plans"]:
                options = ["Scheduled", "Completed", "Cancelled"]
            elif entity_type == "complaints":
                options = ["Open", "In Progress", "Resolved"]
            elif entity_type == "admins":
                options = ["Active", "Suspended"]
        elif name == "tier" and entity_type == "customers":
            options = ["Platinum", "Gold", "Silver"]
        elif name == "role" and entity_type == "admins":
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

@app.post("/api/{entity_type}")
def create_entity(entity_type: str, payload: dict, db: Session = Depends(database.get_db)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    prefix_map = {
        models.Customer: "CU",
        models.Contact: "CO",
        models.Document: "DO",
        models.Lead: "LD",
        models.Opportunity: "OP",
        models.Sale: "SA",
        models.Requirement: "RE",
        models.Quotation: "QU",
        models.SalesOrder: "SO",
        models.Enquiry: "EN",
        models.SiteVisit: "SV",
        models.FollowUp: "FU",
        models.Task: "TA",
        models.Communication: "CM",
        models.VisitPlan: "VP",
        models.Complaint: "CP",
        models.Feedback: "FB",
        models.Report: "RP",
        models.AIAssistantLog: "AI",
        models.Admin: "AD"
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
    return db_obj

@app.put("/api/{entity_type}/{id_str}")
def update_entity(entity_type: str, id_str: str, payload: dict, db: Session = Depends(database.get_db)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    db_obj = db.query(model_class).filter(model_class.id_str == id_str).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    for key, value in payload.items():
        if key not in ["id", "id_str"]:
            setattr(db_obj, key, value)
            
    db.commit()
    db.refresh(db_obj)
    return db_obj

@app.delete("/api/{entity_type}/{id_str}")
def delete_entity(entity_type: str, id_str: str, db: Session = Depends(database.get_db)):
    if entity_type not in ENTITY_MODEL_MAP:
        raise HTTPException(status_code=404, detail="Entity type not found")
        
    model_class = ENTITY_MODEL_MAP[entity_type]
    db_obj = db.query(model_class).filter(model_class.id_str == id_str).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    db.delete(db_obj)
    db.commit()
    return {"status": "success"}


@app.post("/api/ai-assistant/chat")
def chat_with_assistant(req: schemas.ChatRequest, db: Session = Depends(database.get_db)):
    import os
    import requests
    from dotenv import load_dotenv
    
    load_dotenv(override=True)
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"response": "Groq API key not found in .env file. Please check backend config."}
    
    active_customers_count = db.query(models.Customer).filter(models.Customer.status == "Active").count()
    open_opps_count = db.query(models.Opportunity).filter(models.Opportunity.stage != "Lost").count()
    total_sales = db.query(models.Sale).count()
    
    system_prompt = f"""You are Antigravity CRM AI, a helpful, intelligent assistant. 
You help managers run their CRM, analyze data, draft emails, and handle sales.
Here is the current CRM context:
- Active Customers: {active_customers_count}
- Open Opportunities: {open_opps_count}
- Total Sales: {total_sales}

Reply concisely, professionally, and style your output using markdown.
"""
    
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})
        
    messages.append({"role": "user", "content": req.message})
    
    model_name = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_name,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1024
            },
            timeout=15.0
        )
        if response.status_code != 200:
            return {"response": f"Error from Groq API: {response.text}"}
        
        result = response.json()
        ai_message = result["choices"][0]["message"]["content"]
        return {"response": ai_message}
    except Exception as e:
        return {"response": f"Failed to connect to Groq API: {str(e)}"}


@app.get("/api/reports/dashboard")
def get_reports_dashboard(db: Session = Depends(database.get_db)):
    sales = db.query(models.Sale).all()
    rep_sales = {}
    for s in sales:
        rep_name = s.rep or "Unassigned"
        amount = parse_numeric_value(s.amount)
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

