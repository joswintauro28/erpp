from datetime import date, timedelta

from app.integrations.billing_client import get_invoices, get_payments_metrics
from app.integrations.crm_client import get_complaints as get_crm_complaints, get_enquiries as get_crm_enquiries, get_customers
from app.integrations.inventory_client import get_low_stock_products as get_inv_low_stock


class NotificationService:
    def __init__(self, token: str):
        self.token = token

    async def get_notifications(self) -> dict:
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        notifications = []
        summary = {}

        # Overdue invoices via billing-service
        try:
            invoices = await get_invoices(self.token)
            overdue = [inv for inv in invoices if inv.get("status") == "overdue"]
            summary["overdue_invoices"] = len(overdue)
            if overdue:
                notifications.append({
                    "type": "overdue_invoice",
                    "title": f"{len(overdue)} overdue invoice(s)",
                    "severity": "high",
                    "count": len(overdue),
                })

            # Due soon
            due_soon = [
                inv for inv in invoices
                if inv.get("status") in ("sent", "pending")
                and inv.get("due_date")
            ]
            due_soon_filtered = [
                inv for inv in due_soon
                if today <= date.fromisoformat(inv["due_date"]) <= today + timedelta(days=7)
            ]
            summary["due_soon_invoices"] = len(due_soon_filtered)
            if due_soon_filtered:
                notifications.append({
                    "type": "due_soon",
                    "title": f"{len(due_soon_filtered)} invoice(s) due within 7 days",
                    "severity": "medium",
                    "count": len(due_soon_filtered),
                })
        except Exception:
            summary["overdue_invoices"] = 0
            summary["due_soon_invoices"] = 0

        # Low stock via inventory-service
        try:
            low_stock = await get_inv_low_stock(self.token)
            summary["low_stock_items"] = len(low_stock)
            if low_stock:
                notifications.append({
                    "type": "low_stock",
                    "title": f"{len(low_stock)} product(s) below minimum stock level",
                    "severity": "medium",
                    "count": len(low_stock),
                })
        except Exception:
            summary["low_stock_items"] = 0

        # Recent payments via billing-service
        try:
            metrics = await get_payments_metrics(self.token)
            recent_count = metrics.get("thisMonth", 0)
            summary["recent_payments"] = recent_count
            if recent_count > 0:
                notifications.append({
                    "type": "recent_payments",
                    "title": f"{recent_count} payment(s) received this month",
                    "severity": "info",
                    "count": recent_count,
                })
        except Exception:
            summary["recent_payments"] = 0

        # New clients via CRM service
        try:
            customers = await get_customers(self.token)
            new_clients = sum(
                1 for c in customers
                if c.get("updated_at") and date.fromisoformat(c["updated_at"][:10]) >= seven_days_ago
            )
            summary["new_clients"] = new_clients
            if new_clients > 0:
                notifications.append({
                    "type": "new_clients",
                    "title": f"{new_clients} new client(s) added this week",
                    "severity": "info",
                    "count": new_clients,
                })
        except Exception:
            summary["new_clients"] = 0

        # Open CRM complaints
        try:
            complaints = await get_crm_complaints(self.token)
            open_complaints = [c for c in complaints if c.get("status") in ("Open", "In Progress")]
            summary["open_complaints"] = len(open_complaints)
            if open_complaints:
                notifications.append({
                    "type": "open_complaints",
                    "title": f"{len(open_complaints)} open complaint(s) requiring attention",
                    "severity": "high",
                    "count": len(open_complaints),
                })
        except Exception:
            summary["open_complaints"] = 0

        # Pending CRM enquiries
        try:
            enquiries = await get_crm_enquiries(self.token)
            pending_enquiries = [e for e in enquiries if e.get("status") == "New"]
            summary["pending_enquiries"] = len(pending_enquiries)
            if pending_enquiries:
                notifications.append({
                    "type": "pending_enquiries",
                    "title": f"{len(pending_enquiries)} new enquiry(ies) awaiting reply",
                    "severity": "medium",
                    "count": len(pending_enquiries),
                })
        except Exception:
            summary["pending_enquiries"] = 0

        # Inventory low stock from service
        try:
            low_stock_service = await get_inv_low_stock(self.token)
            summary["low_stock_service"] = len(low_stock_service)
        except Exception:
            summary["low_stock_service"] = 0

        return {
            "notifications": notifications,
            "summary": summary,
        }
