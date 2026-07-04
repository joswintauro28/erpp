from app.routers.reports import get_profit_loss

try:
    pl = get_profit_loss(start_date="2026-01-01", end_date="2026-12-31", current_user=1)
    print("Profit Loss OK! Net Profit:", pl["net_profit"])
except Exception as e:
    import traceback
    traceback.print_exc()
