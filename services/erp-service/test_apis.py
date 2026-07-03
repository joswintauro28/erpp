import json
from datetime import date, datetime
from decimal import Decimal

# Helper to serialize datetimes/decimals for json
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)): return obj.isoformat()
        if isinstance(obj, Decimal): return float(obj)
        return super().default(obj)

from app.routers.dashboard import get_stats, invoice_summary, recent_invoices
from app.routers.notifications import get_notifications

try:
    print("Testing Notifications...")
    notifs = get_notifications(current_user=1)
    print("Notifications OK:", len(notifs["notifications"]))
    
    print("Testing Dashboard Stats...")
    stats = get_stats(current_user=1)
    print("Dashboard Stats OK: total_revenue =", stats.get("total_revenue"))
    
    print("Testing Dashboard Invoices...")
    recent = recent_invoices(current_user=1)
    print("Recent Invoices OK:", len(recent))
    
except Exception as e:
    import traceback
    traceback.print_exc()
