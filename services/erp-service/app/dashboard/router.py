from fastapi import APIRouter, Depends

from app.core.deps import get_current_user_id, get_current_token_payload
from app.integrations.billing_client import get_dashboard_billing, get_invoices, get_invoice_summary
from app.integrations.crm_client import get_dashboard_crm, get_customers, get_leads, get_opportunities, get_sales, get_complaints
from app.integrations.inventory_client import get_dashboard_inventory, get_low_stock_products, get_stock_movements, get_warehouses, get_suppliers, get_purchase_orders
from app.dashboard.services import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=dict)
async def get_stats(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(token)
    return await service.get_stats()


@router.get("/recent-invoices", response_model=list)
async def recent_invoices(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    invoices = await get_invoices(token, {"limit": "5"})
    return invoices[:5]


@router.get("/revenue-trend", response_model=list)
async def revenue_trend(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    billing = await get_dashboard_billing(token)
    return billing.get("revenue_trend", [])


@router.get("/invoice-summary", response_model=dict)
async def invoice_summary(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_invoice_summary(token)


@router.get("/client-growth", response_model=list)
async def client_growth(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(token)
    return await service.get_client_growth()


@router.get("/payment-analytics", response_model=list)
async def payment_analytics(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(token)
    return await service.get_payment_analytics()


@router.get("/crm", response_model=dict)
async def crm_dashboard(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_dashboard_crm(token)


@router.get("/crm/customers", response_model=list)
async def crm_customers(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_customers(token)


@router.get("/crm/leads", response_model=list)
async def crm_leads(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_leads(token)


@router.get("/crm/opportunities", response_model=list)
async def crm_opportunities(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_opportunities(token)


@router.get("/crm/sales", response_model=list)
async def crm_sales(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_sales(token)


@router.get("/crm/complaints", response_model=list)
async def crm_complaints(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_complaints(token)


@router.get("/inventory", response_model=dict)
async def inventory_dashboard_data(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_dashboard_inventory(token)


@router.get("/inventory/warehouses", response_model=list)
async def inventory_warehouses(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_warehouses(token)


@router.get("/inventory/suppliers", response_model=list)
async def inventory_suppliers(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_suppliers(token)


@router.get("/inventory/purchase-orders", response_model=list)
async def inventory_purchase_orders(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_purchase_orders(token)


@router.get("/inventory/low-stock", response_model=list)
async def inventory_low_stock(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_low_stock_products(token)


@router.get("/inventory/movements", response_model=list)
async def inventory_movements(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_stock_movements(token)


@router.get("/executive-overview", response_model=dict)
async def executive_overview(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    service = DashboardService(token)
    return await service.get_executive_overview()
