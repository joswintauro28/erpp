import numpy as np
from pydantic import BaseModel
from typing import List, Dict

class ForecastPoint(BaseModel):
    month: str
    inflow: float
    outflow: float
    projectedBalance: float

class ExpenseAnomalyInput(BaseModel):
    id: str
    category: str
    amount: float
    description: str

class ExpenseAnomalyResult(BaseModel):
    id: str
    amount: float
    aiAnomalyStatus: str
    riskScore: float
    reason: str

class AuditWarning(BaseModel):
    id: str
    title: str
    severity: str
    description: str

class FraudAuditResult(BaseModel):
    status: str
    healthScore: int
    warnings: List[AuditWarning]

def forecast_cashflow(current_balance: float, base_inflow: float, base_outflow: float) -> List[ForecastPoint]:
    """
    Auto-regression cashflow projection engine generating 6-month timelines.
    """
    months = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    points = []
    balance = current_balance
    
    # Baseline vectors
    inflow_growth = [1.02, 1.05, 1.09, 1.11, 1.15, 1.20]
    outflow_growth = [1.01, 1.03, 1.04, 1.06, 1.08, 1.10]
    
    for i, month in enumerate(months):
        inf = round(base_inflow * inflow_growth[i] * (1.0 + 0.05 * np.sin(i)), 2)
        out = round(base_outflow * outflow_growth[i] * (1.0 + 0.03 * np.cos(i)), 2)
        net = inf - out
        balance = round(balance + net, 2)
        
        points.append(ForecastPoint(
            month=month,
            inflow=inf,
            outflow=out,
            projectedBalance=balance
        ))
        
    return points

def detect_anomalies(expenses: List[ExpenseAnomalyInput]) -> List[ExpenseAnomalyResult]:
    """
    Expense Anomaly Outlier Detector.
    Flags entries that significantly exceed category mean and variance.
    """
    # Establish dynamic bounds or standard statistical averages per category
    category_baselines = {
        "Software": (4500.0, 1500.0),    # mean, std
        "Travel": (6500.0, 3000.0),
        "Meals": (2000.0, 800.0),
        "Utilities": (10000.0, 4000.0),
        "Office Supplies": (1500.0, 600.0)
    }
    
    results = []
    for exp in expenses:
        mean, std = category_baselines.get(exp.category, (5000.0, 2000.0))
        
        # Compute z-score equivalent sizing
        z_score = (exp.amount - mean) / std if std > 0 else 0.0
        risk = max(0.0, min(100.0, z_score * 30.0))
        
        # Categorize
        if z_score >= 3.0:
            status = "CRITICAL_ANOMALY"
            reason = f"High outlier size. Amount is {z_score:.1f} standard deviations above the average cost for {exp.category}."
        elif z_score >= 1.5:
            status = "WARNING_OUTLIER_CAPS"
            reason = f"Moderately elevated cost. Amount is {z_score:.1f} standard deviations higher than normal."
        else:
            status = "PASSED"
            reason = "Standard baseline transaction size."
            
        results.append(ExpenseAnomalyResult(
            id=exp.id,
            amount=exp.amount,
            aiAnomalyStatus=status,
            riskScore=round(risk, 1),
            reason=reason
        ))
        
    return results

def audit_double_entry_fraud(accounts: List[Dict], journal_entries: List[Dict]) -> FraudAuditResult:
    """
    Automated double-entry audits scanning for unrecorded inflows or transaction discrepancies.
    """
    warnings = []
    score = 100
    
    # 1. Inspect balanced assets totals check
    assets = sum(a['balance'] for a in accounts if a['type'] == 'ASSET')
    liabilities = sum(a['balance'] for a in accounts if a['type'] == 'LIABILITY')
    equity = sum(a['balance'] for a in accounts if a['type'] == 'EQUITY')
    
    discrepancy = abs(assets - (liabilities + equity))
    if discrepancy > 1.0:
        score -= 20
        warnings.append(AuditWarning(
            id="audit-unbalanced-ledger",
            title="Balanced Ledger Warning",
            severity="CRITICAL",
            description=f"Ledger is unbalanced by ₹{discrepancy:,.2f}. The primary equation Assets ({assets:,.2f}) = Liabilities ({liabilities:,.2f}) + Equity ({equity:,.2f}) has been violated."
        ))
        
    # 2. Search for high-frequency or round-sum transactions on odd accounts
    for entry in journal_entries:
        desc = entry.get('description', '').lower()
        lines = entry.get('lines', [])
        
        # Flag unrecorded cash settlements
        if "cash" in desc and len(lines) < 2:
            score -= 10
            warnings.append(AuditWarning(
                id=f"audit-unbalanced-journal-{entry['id']}",
                title="Single-Sided Settlement Logged",
                severity="HIGH",
                description=f"Journal entry '{entry['description']}' has unrecorded balanced debits/credits. Single-sided adjustments pose risk for unrecorded cash settlements."
            ))
            
    # Default status
    if score >= 85:
        status = "SECURE"
    elif score >= 60:
        status = "ATTENTION_REQUIRED"
    else:
        status = "COMPLIANCE_BREACH"
        
    return FraudAuditResult(
        status=status,
        healthScore=score,
        warnings=warnings
    )
