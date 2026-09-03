"""System prompt templates and dynamic suggestion builder for each module context."""


def _base_prompt() -> str:
    return (
        "You are DATACLAIRE, the AI assistant for DATAVEX ERP — a modern enterprise "
        "resource planning system. You are professional, concise, and helpful.\n\n"
        "Rules:\n"
        "- Always respond in a professional, clear tone.\n"
        "- Use Indian number formatting (commas in lakhs/crores) for currency.\n"
        "- Use Indian date format (DD/MM/YYYY) when referencing dates.\n"
        "- Format monetary values as ₹ followed by the amount.\n"
        "- Never fabricate data — if you don't know something, say so.\n"
        "- Never suggest destructive actions (deleting records, etc.).\n"
        "- Redirect users to the appropriate UI page for mutations (create/update/delete).\n"
        "- Keep responses focused and actionable.\n"
        "- When referencing specific records (invoices, products, leads), include their identifiers "
        "(invoice number, SKU, etc.) so the user can find them in the UI.\n"
    )


ADMIN_PROMPT = _base_prompt() + (
    "You are responding in the ADMIN / Executive context. You have access to:\n"
    "- Cross-module KPIs and system health\n"
    "- User management and organization settings\n"
    "- Aggregated data from CRM, Billing, and Inventory modules\n\n"
    "When the user asks about a specific module, guide them to the relevant workstation:\n"
    "- CRM questions → CRM Workstation (port 3001)\n"
    "- Billing questions → Billing Workstation (port 3002)\n"
    "- Inventory questions → Inventory Workstation (port 3004)\n"
)

CRM_PROMPT = _base_prompt() + (
    "You are responding in the CRM context. You have access to:\n"
    "- Customer records (accounts, industries, tiers, ARR, credit limits)\n"
    "- Lead pipeline (scoring, sources, status lifecycle)\n"
    "- Sales requirements, quotations, and sales orders\n"
    "- Opportunity pipeline stages and conversion rates\n\n"
    "Use the live data provided below to give accurate, grounded responses.\n"
    "If the user asks about a specific customer or lead not in the data, suggest searching the CRM.\n"
)

BILLING_PROMPT = _base_prompt() + (
    "You are responding in the Billing context. You have access to:\n"
    "- Invoice data (numbers, amounts, statuses, GST breakdown)\n"
    "- Payment records (received, pending, overdue)\n"
    "- Quotations and credit/debit notes\n"
    "- Revenue trends and outstanding amounts\n\n"
    "Use the live data provided below to give accurate, grounded responses.\n"
    "For GST queries, reference CGST/SGST/IGST breakdowns.\n"
    "Always mention invoice numbers when discussing specific transactions.\n"
)

INVENTORY_PROMPT = _base_prompt() + (
    "You are responding in the Inventory context. You have access to:\n"
    "- Product catalog (SKUs, barcodes, pricing, tax rates)\n"
    "- Stock levels across warehouses (available, reserved, in transit)\n"
    "- Purchase orders and procurement status\n"
    "- Fulfillment pipeline (packing, dispatching, delivered)\n\n"
    "Use the live data provided below to give accurate, grounded responses.\n"
    "When discussing stock, always mention available vs reserved quantities.\n"
    "For low-stock alerts, suggest raising purchase orders.\n"
)

PROMPTS = {
    "admin": ADMIN_PROMPT,
    "crm": CRM_PROMPT,
    "billing": BILLING_PROMPT,
    "inventory": INVENTORY_PROMPT,
}

MODULE_SUGGESTIONS = {
    "admin": [
        "Give me an overview of all modules",
        "What are the pending items across the system?",
        "Show me a summary of recent activity",
        "How is the overall business performance?",
    ],
    "crm": [
        "Show me the top 5 leads by score",
        "How many customers are in the Enterprise tier?",
        "What's our pipeline value this month?",
        "Which leads need follow-up?",
    ],
    "billing": [
        "What invoices are overdue?",
        "Show me the outstanding amount",
        "What's the revenue trend this quarter?",
        "List pending quotations awaiting approval",
    ],
    "inventory": [
        "Which products are low on stock?",
        "What purchase orders are pending?",
        "Show me stock levels for critical items",
        "What's the fulfillment pipeline status?",
    ],
}


def build_dynamic_suggestions(module: str, context_data: dict | None) -> list[dict]:
    """Build context-aware dynamic suggestions based on live data.
    
    Returns list of dicts: {"text": str, "icon": str, "category": str}
    """
    suggestions = []

    if not context_data:
        return [{"text": t, "icon": "💡", "category": "general"} for t in MODULE_SUGGESTIONS.get(module, [])]

    if module == "crm":
        total_customers = context_data.get("total_customers", 0)
        total_leads = context_data.get("total_leads", 0)
        if total_leads > 0:
            suggestions.append({"text": f"Show me all {total_leads} leads and their status", "icon": "👥", "category": "insight"})
        if total_customers > 0:
            suggestions.append({"text": f"Which of our {total_customers} customers need attention?", "icon": "🏢", "category": "insight"})
        suggestions.extend([
            {"text": "Draft a follow-up email for the top lead", "icon": "✉️", "category": "action"},
            {"text": "What's our lead conversion rate?", "icon": "📊", "category": "insight"},
        ])

    elif module == "billing":
        total_invoices = context_data.get("total_invoices", 0)
        if total_invoices > 0:
            suggestions.append({"text": f"Analyze all {total_invoices} invoices by status", "icon": "📄", "category": "insight"})
        payment_metrics = context_data.get("payment_metrics", {})
        if isinstance(payment_metrics, dict):
            outstanding = payment_metrics.get("totalOutstanding", 0)
            if outstanding and outstanding > 0:
                suggestions.append({"text": f"How can we reduce ₹{outstanding:,.0f} outstanding?", "icon": "💰", "category": "action"})
        suggestions.extend([
            {"text": "Generate a payment reminder for overdue invoices", "icon": "⏰", "category": "action"},
            {"text": "Show me this month's revenue breakdown", "icon": "📊", "category": "insight"},
        ])

    elif module == "inventory":
        total_products = context_data.get("total_products", 0)
        low_stock = context_data.get("low_stock_count", 0)
        if low_stock > 0:
            suggestions.append({"text": f"Which {low_stock} products are critically low on stock?", "icon": "⚠️", "category": "insight"})
            suggestions.append({"text": f"Auto-generate POs for the {low_stock} low-stock items", "icon": "🛒", "category": "action"})
        if total_products > 0:
            suggestions.append({"text": f"Show me a summary of all {total_products} products by category", "icon": "📦", "category": "insight"})
        suggestions.extend([
            {"text": "What's the fastest-moving product this week?", "icon": "🚀", "category": "insight"},
            {"text": "Review pending purchase orders", "icon": "📋", "category": "follow_up"},
        ])

    elif module == "admin":
        customers = context_data.get("total_customers", 0)
        invoices = context_data.get("total_invoices", 0)
        products = context_data.get("total_products", 0)
        low_stock = context_data.get("low_stock_items", 0)
        suggestions.append({"text": f"System overview: {customers} customers, {invoices} invoices, {products} products", "icon": "📊", "category": "insight"})
        if low_stock > 0:
            suggestions.append({"text": f"Alert: {low_stock} products need restocking", "icon": "⚠️", "category": "insight"})
        outstanding = context_data.get("outstanding_amount", 0)
        if outstanding and outstanding > 0:
            suggestions.append({"text": f"Collect ₹{outstanding:,.0f} outstanding payments", "icon": "💰", "category": "action"})
        suggestions.append({"text": "What are the top 3 priorities across all modules?", "icon": "🎯", "category": "insight"})

    # If no dynamic suggestions generated, fall back to static
    if not suggestions:
        suggestions = [{"text": t, "icon": "💡", "category": "general"} for t in MODULE_SUGGESTIONS.get(module, [])]

    # Always cap at 6 suggestions
    return suggestions[:6]
