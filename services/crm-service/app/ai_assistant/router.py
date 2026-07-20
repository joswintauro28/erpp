import os
import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from dotenv import load_dotenv
from app import database, models
from app.ai_assistant import schemas, crud
from app.core.router_utils import generic_summary

load_dotenv(override=True)

router = APIRouter(prefix="/api/ai-assistant", tags=["ai-assistant"])

@router.get("", response_model=schemas.AIAssistantManagementData)
async def get_ai_logs_data(db=Depends(database.get_db)):
    data = await crud.get_ai_logs(db)
    summary = generic_summary(data, active_vals=['Success'], attention_vals=['Failed'])
    return {"summary": summary, "ai_logs": data}

@router.post("/chat")
async def chat_with_assistant(req: schemas.ChatRequest, db=Depends(database.get_db)):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"response": "Groq API key not found in .env file. Please check backend config."}
    
    result = await db.execute(select(func.count(models.Customer.id)).where(models.Customer.status == "Active"))
    active_customers_count = result.scalar()
    result = await db.execute(select(func.count(models.Opportunity.id)).where(models.Opportunity.stage != "Lost"))
    open_opps_count = result.scalar()
    result = await db.execute(select(func.count(models.SalesOrder.id)))
    total_sales = result.scalar()
    
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
