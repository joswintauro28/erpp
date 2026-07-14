from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.inventory_client import (
    get_warehouses, get_warehouse, create_warehouse, update_warehouse, delete_warehouse,
    get_stock, adjust_stock,
    get_stock_movements, create_stock_movement,
    get_suppliers, get_supplier, create_supplier, update_supplier, delete_supplier,
    get_purchase_orders, get_purchase_order, create_purchase_order,
    update_purchase_order_status, delete_purchase_order,
    get_serial_numbers, get_serial_number, create_serial_number,
    update_serial_number, delete_serial_number,
)

router = APIRouter(tags=["inventory"])


# ─── Warehouses ──────────────────────────────────────────────

@router.get("/warehouses", response_model=list[dict])
async def list_warehouses(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_warehouses(token)


@router.post("/warehouses", response_model=dict, status_code=201)
async def create_new_warehouse(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_warehouse(token, body)


@router.get("/warehouses/{warehouse_id}", response_model=dict)
async def get_warehouse_by_id(
    warehouse_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_warehouse(token, warehouse_id)


@router.put("/warehouses/{warehouse_id}", response_model=dict)
async def update_warehouse_by_id(
    warehouse_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_warehouse(token, warehouse_id, body)


@router.delete("/warehouses/{warehouse_id}", status_code=204)
async def delete_warehouse_by_id(
    warehouse_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_warehouse(token, warehouse_id)


# ─── Stock ───────────────────────────────────────────────────

@router.get("/stock", response_model=list[dict])
async def list_stock(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_stock(token)


@router.put("/stock/adjust", response_model=dict)
async def adjust_stock_level(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await adjust_stock(token, body)


# ─── Stock Movements ─────────────────────────────────────────

@router.get("/stock/movements", response_model=list[dict])
async def list_stock_movements(
    limit: int = 50,
    product_id: int | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    params: dict[str, str] = {"limit": str(limit)}
    if product_id is not None:
        params["product_id"] = str(product_id)
    return await get_stock_movements(token, params)


@router.post("/stock/movements", response_model=dict, status_code=201)
async def create_new_stock_movement(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_stock_movement(token, body)


# ─── Suppliers ───────────────────────────────────────────────

@router.get("/suppliers", response_model=list[dict])
async def list_suppliers(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_suppliers(token)


@router.post("/suppliers", response_model=dict, status_code=201)
async def create_new_supplier(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_supplier(token, body)


@router.get("/suppliers/{supplier_id}", response_model=dict)
async def get_supplier_by_id(
    supplier_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_supplier(token, supplier_id)


@router.put("/suppliers/{supplier_id}", response_model=dict)
async def update_supplier_by_id(
    supplier_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_supplier(token, supplier_id, body)


@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier_by_id(
    supplier_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_supplier(token, supplier_id)


# ─── Purchase Orders ─────────────────────────────────────────

@router.get("/purchase-orders", response_model=list[dict])
async def list_purchase_orders(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_purchase_orders(token)


@router.post("/purchase-orders", response_model=dict, status_code=201)
async def create_new_purchase_order(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_purchase_order(token, body)


@router.get("/purchase-orders/{po_id}", response_model=dict)
async def get_purchase_order_by_id(
    po_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_purchase_order(token, po_id)


@router.put("/purchase-orders/{po_id}/status", response_model=dict)
async def update_purchase_order_status_endpoint(
    po_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_purchase_order_status(token, po_id, body.get("status", ""))


@router.delete("/purchase-orders/{po_id}", status_code=204)
async def delete_purchase_order_by_id(
    po_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_purchase_order(token, po_id)


# ─── Serial Numbers ──────────────────────────────────────────

@router.get("/serial-numbers", response_model=list[dict])
async def list_serial_numbers(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_serial_numbers(token)


@router.post("/serial-numbers", response_model=dict, status_code=201)
async def create_new_serial_number(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_serial_number(token, body)


@router.get("/serial-numbers/{serial_id}", response_model=dict)
async def get_serial_number_by_id(
    serial_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_serial_number(token, serial_id)


@router.put("/serial-numbers/{serial_id}", response_model=dict)
async def update_serial_number_by_id(
    serial_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_serial_number(token, serial_id, body)


@router.delete("/serial-numbers/{serial_id}", status_code=204)
async def delete_serial_number_by_id(
    serial_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_serial_number(token, serial_id)
