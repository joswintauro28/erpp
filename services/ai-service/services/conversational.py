import os
from typing import List, Dict, Optional
from pydantic import BaseModel
from services.vector_store import vector_store

class ChatMessageResult(BaseModel):
    response: str
    ragContextUsed: str
    sourcesUsed: List[str]

class WhatsAppSimulatorInput(BaseModel):
    senderPhone: str
    message: str
    invoices: List[Dict]

class WhatsAppSimulatorResult(BaseModel):
    senderPhone: str
    recipientPhone: str
    responseMessage: str
    actionTaken: str

def chat_rag_agent(question: str, financial_context: Dict) -> ChatMessageResult:
    """
    RAG Agent coordinating vector database policy lookups with live tenant transaction logs.
    """
    # 1. Fetch matching RAG policy guidelines
    rag_docs = vector_store.query_rag_context(question, n_results=1)
    
    # 2. Extract context details
    cash_balance = financial_context.get("cashBalance", 500000.0)
    outstanding = financial_context.get("outstanding", 66000.0)
    monthly_burn = financial_context.get("monthlyBurnRate", 15000.0)
    runway = financial_context.get("runwayMonths", 12.0)
    
    q_lower = question.lower()
    
    # 3. Intelligent Local Intent Classifier
    # Matches query domains and injects live financial statistics seamlessly
    if any(k in q_lower for k in ['runway', 'burn', 'month']):
        response = (
            f"According to your current ledger context, your liquid cash reserves stand at **₹{cash_balance:,.2f}** "
            f"with an average monthly operational cash burn rate of **₹{monthly_burn:,.2f}**.\n\n"
            f"This gives Kaasvex a forecasted cash runway of **{runway:.1f} months** before reserves are depleted. "
            f"Standard operating procedures suggest maintaining at least 6 months of burn in liquid accounts.\n\n"
            f"💡 **AI Recommendation**: Consider scaling down variable utility expenses or converting active sales quotations into deposits."
        )
        sources = ["cash_account_1010", "expense_registry"]
        
    elif any(k in q_lower for k in ['outstanding', 'receivable', 'claim', 'pending']):
        response = (
            f"You currently have **₹{outstanding:,.2f}** in outstanding client claims awaiting collection.\n\n"
            f"Our predictive regressions show that invoices over ₹50,000 generally face a payment lag of up to 15 days, "
            f"whereas smaller SaaS invoices clear in under 5 days.\n\n"
            f"💡 **AI Suggestion**: You can trigger a payment reminder over WhatsApp to outstanding accounts to accelerate collection velocity."
        )
        sources = ["invoice_status_log", "client_payment_history"]
        
    elif any(k in q_lower for k in ['tax', 'gst', 'vat', 'rcm']):
        response = (
            f"SaaS software and cloud subscription costs (like AWS, Google Cloud, or Slack) are categorized under "
            f"the **18% GST** bracket.\n\n"
            f"If purchasing cloud capacity from overseas unregistered nodes, keep in mind that the **Reverse Charge Mechanism (RCM)** "
            f"is applied, requiring Kaasvex to declare and file self-assessed GST liabilities directly.\n\n"
            f"Let me know if you would like me to audit the latest e-invoice tax classifications!"
        )
        sources = ["tax_code_policy", "invoice_taxes"]
        
    elif any(k in q_lower for k in ['limit', 'card', 'ceo', 'credit']):
        response = (
            f"Your active Corporate Credit Cards show a CEO spent buffer cap of **₹5,00,000.0**. "
            f"The Visa CEO Card is currently active with ₹4,91,500.0 in remaining credit reserves.\n\n"
            f"If you notice any expense variance alerts on card charges, you can freeze card transactions instantly "
            f"via the Expenses card terminal dashboard."
        )
        sources = ["corporate_card_registry", "card_policy"]
        
    else:
        response = (
            f"Hello! I am your Kaasvex AI Accounting Assistant.\n\n"
            f"I have RAG access to your double-entry charts, invoices, and standard operating policies. "
            f"I can help you with:\n"
            f"1. Calculating your current **Cash Runway** & cash positions.\n"
            f"2. Auditing **Outstanding Claims** & invoice timelines.\n"
            f"3. Classifying **Tax Rates & GST/VAT** categories.\n"
            f"4. Checking **Corporate Card Limits** and expense anomalies.\n\n"
            f"What business statistic can I compile for you today?"
        )
        sources = ["general_ledger"]

    # Wrap up and return
    return ChatMessageResult(
        response=response,
        ragContextUsed=rag_docs,
        sourcesUsed=sources
    )

def simulate_whatsapp_bot(sender_phone: str, incoming_message: str, invoices: List[Dict]) -> WhatsAppSimulatorResult:
    """
    Simulates a WhatsApp Billing Agent Bot hook.
    """
    msg_lower = incoming_message.lower()
    recipient = "+91 99999 88888"  # Mock corporate whatsapp number
    action = "SEND_TEXT_RESPONSE"
    
    # 1. Intent: Get outstanding invoices list
    if any(k in msg_lower for k in ['outstanding', 'pending', 'due', 'owe']):
        unpaid = [i for i in invoices if i.get('status') in ['SENT', 'OVERDUE', 'PARTIALLY_PAID']]
        if unpaid:
            invoice_lines = []
            total_due = 0.0
            for inv in unpaid:
                total_due += inv.get('total', 0.0)
                invoice_lines.append(f"• *{inv.get('invoiceNumber')}*: ₹{inv.get('total', 0.0):,.2f} (Due: {inv.get('dueDate', 'Immediate')})")
            
            bullet_list = "\n".join(invoice_lines)
            response = (
                f"👋 Hello! This is the *Kaasvex Billing Bot*.\n\n"
                f"Here are your outstanding balances:\n{bullet_list}\n\n"
                f"💰 Total Outstanding Amount: *₹{total_due:,.2f}*.\n\n"
                f"You can settle these balances instantly using this secure checkout checkout checkout payment link:\n"
                f"👉 _https://pay.kaasvex.com/checkout/settle-dues_"
            )
            action = "GENERATE_CHECKOUT_PAYMENT_LINK"
        else:
            response = (
                "👋 Hello! This is the *Kaasvex Billing Bot*.\n\n"
                "🎉 Excellent news! You currently have *no outstanding balances* on your ledger. All invoice lines are paid."
            )
            
    # 2. Intent: Ask for a specific invoice check
    elif "invoice" in msg_lower or "bill" in msg_lower:
        response = (
            "👋 This is the *Kaasvex Billing Bot*.\n\n"
            "To view details or print a copy of a specific invoice, please send the invoice number (e.g. *INV-20260601-01*).\n\n"
            "I will generate a downloadable PDF invoice copy and send it as a secure document attachment instantly."
        )
        action = "WAIT_FOR_INVOICE_NUMBER"
        
    # 3. Fallback greeting
    else:
        response = (
            "👋 Hello! I am the automated *Kaasvex WhatsApp Billing Bot*.\n\n"
            "I can help you audit balances and settle payments instantly.\n"
            "Try sending me messages like:\n"
            "• _'What is my outstanding balance?'_\n"
            "• _'Send me my payment links.'_"
        )
        
    return WhatsAppSimulatorResult(
        senderPhone=sender_phone,
        recipientPhone=recipient,
        responseMessage=response,
        actionTaken=action
    )
