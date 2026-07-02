from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import services
from services.invoice_intel import parse_invoice_text, ParsedInvoiceResult
from services.crm_intel import score_leads, predict_churn, LeadInput, ClientInput, LeadScoreResult, ClientChurnResult
from services.financial_intel import forecast_cashflow, detect_anomalies, audit_double_entry_fraud, ExpenseAnomalyInput, ExpenseAnomalyResult, ForecastPoint, FraudAuditResult
from services.conversational import chat_rag_agent, simulate_whatsapp_bot, ChatMessageResult, WhatsAppSimulatorInput, WhatsAppSimulatorResult

app = FastAPI(
    title="Kaasvex AI Automation Layer Service",
    description="Python FastAPI service driving smart regressions, classifications, and LangChain RAG integrations.",
    version="1.0.0"
)

# Enable CORS for Next.js and Express backend routing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class InvoiceParseRequest(BaseModel):
    text: str

class LeadScoreRequest(BaseModel):
    leads: List[LeadInput]

class ClientChurnRequest(BaseModel):
    clients: List[ClientInput]

class CashflowForecastRequest(BaseModel):
    currentBalance: float
    baseInflow: float
    baseOutflow: float

class ExpenseAnomalyRequest(BaseModel):
    expenses: List[ExpenseAnomalyInput]

class AuditRequest(BaseModel):
    accounts: List[Dict[str, Any]]
    journalEntries: List[Dict[str, Any]]

class ChatRequest(BaseModel):
    question: str
    financialContext: Dict[str, Any]

@app.get("/health")
def health_check():
    return {"status": "OK", "message": "Kaasvex Python AI Microservice is fully operational"}

@app.post("/invoice/parse", response_model=ParsedInvoiceResult)
def invoice_parse_endpoint(payload: InvoiceParseRequest):
    try:
        return parse_invoice_text(payload.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR heuristic parsing failed: {str(e)}")

@app.post("/crm/score", response_model=List[LeadScoreResult])
def crm_score_leads_endpoint(payload: LeadScoreRequest):
    try:
        return score_leads(payload.leads)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Leads scoring calculation error: {str(e)}")

@app.post("/crm/churn", response_model=List[ClientChurnResult])
def crm_predict_churn_endpoint(payload: ClientChurnRequest):
    try:
        return predict_churn(payload.clients)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Client churn risk projection failed: {str(e)}")

@app.post("/finance/forecast", response_model=List[ForecastPoint])
def finance_forecast_endpoint(payload: CashflowForecastRequest):
    try:
        return forecast_cashflow(payload.currentBalance, payload.baseInflow, payload.baseOutflow)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cashflow auto-regression forecast failed: {str(e)}")

@app.post("/finance/anomalies", response_model=List[ExpenseAnomalyResult])
def finance_detect_anomalies_endpoint(payload: ExpenseAnomalyRequest):
    try:
        return detect_anomalies(payload.expenses)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Expense outlier anomaly analysis failed: {str(e)}")

@app.post("/finance/audit", response_model=FraudAuditResult)
def finance_audit_endpoint(payload: AuditRequest):
    try:
        return audit_double_entry_fraud(payload.accounts, payload.journalEntries)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GL balance audit failed: {str(e)}")

@app.post("/chat", response_model=ChatMessageResult)
def conversational_chat_endpoint(payload: ChatRequest):
    try:
        return chat_rag_agent(payload.question, payload.financialContext)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG agent query failure: {str(e)}")

@app.post("/whatsapp/simulate", response_model=WhatsAppSimulatorResult)
def whatsapp_simulate_endpoint(payload: WhatsAppSimulatorInput):
    try:
        return simulate_whatsapp_bot(payload.senderPhone, payload.message, payload.invoices)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"WhatsApp webhook response mapping error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
