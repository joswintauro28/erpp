from fastapi import APIRouter, Depends
from app import database
from app.sales_orders import schemas, crud

router = APIRouter(prefix="/api/sales-orders", tags=["sales-orders"])

@router.get("", response_model=schemas.SalesOrderManagementData)
async def get_sales_orders_data(db=Depends(database.get_db)):
    sales_orders = await crud.get_sales_orders(db)
    
    total = len(sales_orders)
    open_count = len([so for so in sales_orders if so.status in ['Pending', 'Confirmed']])
    at_risk = len([so for so in sales_orders if so.status == 'Cancelled'])
    owners_count = len(set(so.owner for so in sales_orders if so.owner)) or 1
    
    summary = {
        "total_orders": total,
        "open": open_count,
        "overdue_at_risk": at_risk,
        "owners": owners_count
    }
    
    return {
        "summary": summary,
        "sales_orders": sales_orders
    }
