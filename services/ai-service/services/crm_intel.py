from pydantic import BaseModel
from typing import List, Optional

class LeadInput(BaseModel):
    id: str
    companyName: str
    contactPerson: str
    email: str
    phone: Optional[str] = None
    status: str
    source: Optional[str] = None
    leadScore: int = 0
    activityCount: int = 0

class LeadScoreResult(BaseModel):
    id: str
    aiScore: float
    aiFollowUp: str

class ClientInput(BaseModel):
    id: str
    name: str
    status: str
    totalRevenue: float
    invoiceCount: int
    daysSinceLastInvoice: int
    activityCount: int

class ClientChurnResult(BaseModel):
    id: str
    aiChurnRisk: float
    riskLabel: str

def score_leads(leads: List[LeadInput]) -> List[LeadScoreResult]:
    """
    Lead Scoring Classifier.
    Computes a score (0-100) and compiles follow-up recommendations.
    """
    results = []
    for lead in leads:
        score = 50.0  # baseline
        
        # 1. Source parameters
        src = (lead.source or "").lower()
        if "referral" in src:
            score += 20.0
        elif "linkedin" in src or "website" in src:
            score += 10.0
        elif "cold" in src:
            score -= 10.0
            
        # 2. Activity status parameters
        status = lead.status.lower()
        if "proposal" in status or "negotiation" in status:
            score += 15.0
        elif "qualified" in status:
            score += 5.0
            
        # 3. CRM interaction parameters
        score += min(15.0, lead.activityCount * 3.0)
        
        # Bound limits
        score = max(0.0, min(100.0, score))
        
        # 4. Compiling tactical follow-ups
        if score >= 75.0:
            rec = "🔥 HOT: Schedule a executive closing demo. Send custom commercial pricing rate card today."
        elif score >= 50.0:
            rec = "⚡ WARM: Deliver product case studies and email follow-up checking their technical timeline."
        else:
            rec = "❄️ COLD: Enroll in monthly automated product newsletters. Reach out in 14 days."
            
        results.append(LeadScoreResult(
            id=lead.id,
            aiScore=round(score, 1),
            aiFollowUp=rec
        ))
        
    return results

def predict_churn(clients: List[ClientInput]) -> List[ClientChurnResult]:
    """
    Predicts churn risks dynamically based on client inactive dates and CRM touchpoints.
    """
    results = []
    for client in clients:
        risk = 10.0  # baseline churn risk
        
        # Churn rises if no invoices billed recently
        if client.daysSinceLastInvoice > 90:
            risk += 50.0
        elif client.daysSinceLastInvoice > 45:
            risk += 25.0
        elif client.daysSinceLastInvoice > 30:
            risk += 10.0
            
        # Churn falls if activities (touches) are present
        risk -= min(20.0, client.activityCount * 4.0)
        
        # Churn rises if invoice counts are very low but client has been around
        if client.invoiceCount <= 1 and client.daysSinceLastInvoice > 60:
            risk += 15.0
            
        # Bound limits
        risk = max(0.0, min(100.0, risk))
        
        # Determine labels
        if risk >= 60.0:
            label = "CRITICAL CHURN RISK"
        elif risk >= 30.0:
            label = "ATTENTION REQUIRED"
        else:
            label = "STABLE CLIENT"
            
        results.append(ClientChurnResult(
            id=client.id,
            aiChurnRisk=round(risk, 1),
            riskLabel=label
        ))
        
    return results
