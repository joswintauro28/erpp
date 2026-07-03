"""
VexBill AI Context Builder
Responsible for:
1. Detecting intents from user messages (weighted scoring, multi-intent)
2. Detecting temporal references (today, this month, etc.)
3. Building structured business context from ai_tools
4. Constructing the system prompt for Groq
"""
import re
from datetime import date, timedelta, datetime
from app.services import ai_tools

# ────────────────────────── INTENT DETECTION ────────────────────────────────

INTENT_KEYWORDS = {
    "inventory_intent": {
        "stock": 1.0, "inventory": 1.0, "product": 0.8, "products": 0.8,
        "low": 0.6, "units": 0.5, "warehouse": 0.7, "item": 0.5, "items": 0.5,
        "laptop": 0.9, "mobile": 0.9, "available": 0.4
    },
    "invoice_intent": {
        "invoice": 1.0, "invoices": 1.0, "bill": 0.8, "bills": 0.8,
        "overdue": 0.9, "outstanding": 0.8, "due": 0.5, "unpaid": 0.9, "receivable": 0.7
    },
    "payment_intent": {
        "payment": 1.0, "payments": 1.0, "paid": 0.8, "received": 0.6,
        "cash": 0.5, "collection": 0.7, "collected": 0.7
    },
    "expense_intent": {
        "expense": 1.0, "expenses": 1.0, "spend": 0.8, "spending": 0.8,
        "cost": 0.7, "costs": 0.7, "purchase": 0.5
    },
    "client_intent": {
        "client": 1.0, "clients": 1.0, "customer": 1.0, "customers": 1.0,
        "top": 0.5, "buyer": 0.7, "buyers": 0.7
    },
    "lead_intent": {
        "lead": 1.0, "leads": 1.0, "prospect": 0.8, "prospects": 0.8,
        "conversion": 0.7, "pipeline": 0.6
    },
    "quotation_intent": {
        "quotation": 1.0, "quotations": 1.0, "quote": 1.0, "quotes": 1.0,
        "estimate": 0.8, "estimates": 0.8, "proposal": 0.7
    },
    "report_intent": {
        "profit": 1.0, "revenue": 1.0, "report": 0.9, "margin": 0.8,
        "loss": 0.8, "financial": 0.7, "income": 0.8, "earnings": 0.8,
        "growth": 0.6
    },
    "dashboard_intent": {
        "summary": 1.0, "dashboard": 1.0, "snapshot": 1.0, "overview": 1.0,
        "business": 0.8, "health": 0.7, "doing": 0.4, "going": 0.3, "how": 0.2
    }
}


def detect_intent(message: str) -> list[str]:
    """
    Weighted intent scoring. Returns list of top detected intents.
    Supports multiple simultaneous intents.
    """
    words = re.findall(r'\w+', message.lower())

    scores = {intent: 0.0 for intent in INTENT_KEYWORDS}

    for word in words:
        for intent, keywords in INTENT_KEYWORDS.items():
            if word in keywords:
                scores[intent] += keywords[word]

    # Fallback: if nothing matched, treat as dashboard
    if all(s == 0.0 for s in scores.values()):
        return ["dashboard_intent"]

    max_score = max(scores.values())

    # Return all intents scoring >= 50% of the top score
    detected = [
        intent for intent, score in scores.items()
        if score >= (max_score * 0.5) and score > 0
    ]
    return detected


# ────────────────────────── TEMPORAL DETECTION ──────────────────────────────

TEMPORAL_PATTERNS = {
    "today": lambda: (date.today(), date.today()),
    "yesterday": lambda: (date.today() - timedelta(days=1), date.today() - timedelta(days=1)),
    "this week": lambda: (date.today() - timedelta(days=date.today().weekday()), date.today()),
    "last week": lambda: (
        date.today() - timedelta(days=date.today().weekday() + 7),
        date.today() - timedelta(days=date.today().weekday() + 1)
    ),
    "this month": lambda: (date.today().replace(day=1), date.today()),
    "last month": lambda: (
        (date.today().replace(day=1) - timedelta(days=1)).replace(day=1),
        date.today().replace(day=1) - timedelta(days=1)
    ),
    "this quarter": lambda: (
        date.today().replace(month=((date.today().month - 1) // 3) * 3 + 1, day=1),
        date.today()
    ),
    "this year": lambda: (date(date.today().year, 1, 1), date.today()),
    "last year": lambda: (date(date.today().year - 1, 1, 1), date(date.today().year - 1, 12, 31)),
}


def detect_temporal(message: str):
    """
    Detects temporal references in the user message.
    Returns (start_date, end_date) or (None, None) if no temporal reference found.
    """
    msg_lower = message.lower()

    for pattern, resolver in TEMPORAL_PATTERNS.items():
        if pattern in msg_lower:
            start, end = resolver()
            print(f"[AI_CONTEXT] Temporal detected: '{pattern}' -> {start} to {end}")
            return start, end

    return None, None


# ────────────────────────── CONTEXT BUILDER ──────────────────────────────

def build_context(user_id: int, message: str) -> str:
    """
    Main orchestrator:
    1. Detect intents
    2. Detect temporal range
    3. Query only required tables via ai_tools
    4. Build system prompt
    """
    intents = detect_intent(message)
    start_date, end_date = detect_temporal(message)
    context_blocks = []

    print(f"\n{'='*60}")
    print(f"[AI_CONTEXT] User Message: {message}")
    print(f"[AI_CONTEXT] Detected Intents: {intents}")
    if start_date:
        print(f"[AI_CONTEXT] Date Range: {start_date} -> {end_date}")
    print(f"{'='*60}")

    # Dashboard intent → full business snapshot
    if "dashboard_intent" in intents:
        context_blocks.append(ai_tools.get_dashboard_snapshot(user_id))
        context_blocks.append(ai_tools.get_inventory_summary(user_id))
        context_blocks.append(ai_tools.get_top_customers(user_id))
        context_blocks.append(ai_tools.get_lead_summary(user_id))
    else:
        if "report_intent" in intents:
            context_blocks.append(ai_tools.get_profit_summary(user_id, start_date, end_date))
            context_blocks.append(ai_tools.get_revenue_summary(user_id, start_date, end_date))

        if "inventory_intent" in intents:
            context_blocks.append(ai_tools.get_inventory_summary(user_id))
            context_blocks.append(ai_tools.get_low_stock_products(user_id))

        if "invoice_intent" in intents:
            context_blocks.append(ai_tools.get_invoice_summary(user_id))
            context_blocks.append(ai_tools.get_overdue_invoices(user_id))

        if "payment_intent" in intents:
            context_blocks.append(ai_tools.get_payment_summary(user_id, start_date, end_date))

        if "expense_intent" in intents:
            context_blocks.append(ai_tools.get_expense_summary(user_id, start_date, end_date))

        if "client_intent" in intents:
            context_blocks.append(ai_tools.get_top_customers(user_id))

        if "lead_intent" in intents:
            context_blocks.append(ai_tools.get_lead_summary(user_id))

        if "quotation_intent" in intents:
            context_blocks.append(ai_tools.get_quotation_summary(user_id))

    business_data = "\n".join(context_blocks)

    # Add today's date context so the LLM knows the current date
    today_str = date.today().strftime("%A, %B %d, %Y")

    system_prompt = f"""You are VexBill AI, the intelligent business copilot for an ERP system.
Today's date is: {today_str}

You have access to the following LIVE business data queried directly from the company database:

{business_data}

CRITICAL RULES:
* Answer ONLY from the business data provided above.
* NEVER invent, hallucinate, or guess any figures.
* If the data shows zero or no records for a period, say "No transactions were recorded for that period."
* When the user asks about "today's profit", use ONLY the data for today's date range, not lifetime totals.
* Use the Indian Rupee symbol (₹) for all currency values.
* Be concise, accurate, and professional.
* If asked about data not provided above, say "I don't have that specific data in my current context. Try asking about inventory, invoices, payments, expenses, clients, leads, or quotations."
"""

    print(f"[AI_CONTEXT] Context size: {len(business_data)} chars")
    print(f"[AI_CONTEXT] Context preview:\n{business_data[:500]}...")
    print(f"{'='*60}\n")

    return system_prompt
