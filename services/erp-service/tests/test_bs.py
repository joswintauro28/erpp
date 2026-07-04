from app.routers.reports import get_profit_loss, get_balance_sheet

try:
    pl = get_profit_loss(current_user=1)
    bs = get_balance_sheet(current_user=1)

    net_profit = pl["net_profit"]
    
    cash = bs["assets"]["current"][0]["amount"]
    ar = bs["assets"]["current"][1]["amount"]
    inventory = bs["assets"]["current"][2]["amount"]
    assets = bs["assets"]["total"]
    
    ap = bs["liabilities"]["total"]
    
    retained_earnings = bs["equity"]["total"]
    
    print(f"Net Profit (from P&L): {net_profit}")
    print(f"Inventory: {inventory}")
    print(f"Net Profit + Inventory: {net_profit + inventory}")
    print(f"Assets ({assets}) - Liabilities ({ap}) = {assets - ap}")
    print(f"Current Retained Earnings calculation: {retained_earnings}")

except Exception as e:
    import traceback
    traceback.print_exc()
