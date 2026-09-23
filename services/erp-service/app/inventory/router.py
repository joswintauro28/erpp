from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.inventory_client import (
    get_warehouses, get_warehouse, create_warehouse, update_warehouse, delete_warehouse,
    get_stock, adjust_stock,
    get_stock_movements, create_stock_movement,
    get_suppliers, get_supplier, create_supplier, update_supplier, delete_supplier,
    get_purchase_orders, get_purchase_order, create_purchase_order,
    update_purchase_order_status, delete_purchase_order, putaway_purchase_order,
    get_serial_numbers, get_serial_number, create_serial_number,
    update_serial_number, delete_serial_number, get_serial_numbers_stats,
    get_fulfillment_orders, get_fulfillment_order, create_fulfillment_order,
    check_fulfillment_stock, reserve_fulfillment_stock,
    pick_fulfillment_items, pack_fulfillment_items,
    dispatch_fulfillment_order, step_back_fulfillment_order,
    trigger_po_for_fulfillment_shortage, generate_invoice_for_fulfillment,
    delete_fulfillment_order, create_fulfillment_batch,
    get_purchase_requisitions, create_purchase_requisition, submit_purchase_requisition,
    approve_purchase_requisition, reject_purchase_requisition, convert_purchase_requisition_to_po,
    delete_purchase_requisition,
    get_quality_checks, create_quality_check, record_quality_check_result,
    get_work_orders, create_work_order, release_work_order, start_work_order,
    complete_work_order, cancel_work_order, issue_work_order_material, delete_work_order,
    start_work_order_operation, complete_work_order_operation,
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
    product_id: int | None = None,
    warehouse_id: int | None = None,
    status: str | None = None,
    search: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    params = {}
    if product_id is not None:
        params["product_id"] = str(product_id)
    if warehouse_id is not None:
        params["warehouse_id"] = str(warehouse_id)
    if status is not None:
        params["status"] = status
    if search is not None:
        params["search"] = search
    return await get_serial_numbers(token, params or None)


@router.get("/serial-numbers/stats", response_model=dict)
async def get_serial_numbers_stats_endpoint(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_serial_numbers_stats(token)


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


# ─── Fulfillment ──────────────────────────────────────────────

@router.get("/fulfillment/orders", response_model=list[dict])
async def list_fulfillment_orders(
    status: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_fulfillment_orders(token, status)


@router.post("/fulfillment/orders", response_model=dict, status_code=201)
async def create_new_fulfillment_order(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_fulfillment_order(token, body)


@router.get("/fulfillment/orders/{fulfillment_id}", response_model=dict)
async def get_fulfillment_order_by_id(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_fulfillment_order(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/check-stock", response_model=dict)
async def check_fulfillment_stock_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await check_fulfillment_stock(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/reserve", response_model=dict)
async def reserve_fulfillment_stock_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await reserve_fulfillment_stock(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/pick-list", response_model=dict)
async def pick_fulfillment_items_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await pick_fulfillment_items(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/pack", response_model=dict)
async def pack_fulfillment_items_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await pack_fulfillment_items(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/dispatch", response_model=dict)
async def dispatch_fulfillment_order_endpoint(
    fulfillment_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await dispatch_fulfillment_order(token, fulfillment_id, body)


@router.post("/fulfillment/orders/{fulfillment_id}/step-back", response_model=dict)
async def step_back_fulfillment_order_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await step_back_fulfillment_order(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/create-po-shortage", response_model=dict)
async def trigger_po_for_fulfillment_shortage_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await trigger_po_for_fulfillment_shortage(token, fulfillment_id)


@router.post("/fulfillment/orders/{fulfillment_id}/generate-invoice", response_model=dict)
async def generate_invoice_for_fulfillment_endpoint(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await generate_invoice_for_fulfillment(token, fulfillment_id)


@router.delete("/fulfillment/orders/{fulfillment_id}", status_code=204)
async def delete_fulfillment_order_by_id(
    fulfillment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_fulfillment_order(token, fulfillment_id)


@router.post("/fulfillment/batches", response_model=dict, status_code=201)
async def create_fulfillment_batch_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_fulfillment_batch(token, body)


# ─── Purchase Orders Putaway ──────────────────────────────────

@router.post("/purchase-orders/{po_id}/putaway", response_model=dict)
async def putaway_purchase_order_endpoint(
    po_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await putaway_purchase_order(token, po_id, body)


# ─── Purchase Requisitions ────────────────────────────────────

@router.get("/purchase-requisitions", response_model=list[dict])
async def list_purchase_requisitions(
    status: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_purchase_requisitions(token, status)


@router.post("/purchase-requisitions", response_model=dict, status_code=201)
async def create_new_purchase_requisition(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_purchase_requisition(token, body)


@router.post("/purchase-requisitions/{pr_id}/submit", response_model=dict)
async def submit_purchase_requisition_endpoint(
    pr_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await submit_purchase_requisition(token, pr_id)


@router.post("/purchase-requisitions/{pr_id}/approve", response_model=dict)
async def approve_purchase_requisition_endpoint(
    pr_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await approve_purchase_requisition(token, pr_id)


@router.post("/purchase-requisitions/{pr_id}/reject", response_model=dict)
async def reject_purchase_requisition_endpoint(
    pr_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await reject_purchase_requisition(token, pr_id)


@router.post("/purchase-requisitions/{pr_id}/convert", response_model=dict)
async def convert_purchase_requisition_to_po_endpoint(
    pr_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await convert_purchase_requisition_to_po(token, pr_id, body)


@router.delete("/purchase-requisitions/{pr_id}", status_code=204)
async def delete_purchase_requisition_by_id(
    pr_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_purchase_requisition(token, pr_id)


# ─── Quality Checks ───────────────────────────────────────────

@router.get("/quality-checks", response_model=list[dict])
async def list_quality_checks(
    status: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_quality_checks(token, status)


@router.post("/quality-checks", response_model=dict, status_code=201)
async def create_new_quality_check(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_quality_check(token, body)


@router.put("/quality-checks/{qc_id}/result", response_model=dict)
async def record_quality_check_result_endpoint(
    qc_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await record_quality_check_result(token, qc_id, body)


# ─── Work Orders ──────────────────────────────────────────────

@router.get("/work-orders", response_model=list[dict])
async def list_work_orders(
    status: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_work_orders(token, status)


@router.post("/work-orders", response_model=dict, status_code=201)
async def create_new_work_order(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_work_order(token, body)


@router.post("/work-orders/{wo_id}/release", response_model=dict)
async def release_work_order_endpoint(
    wo_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await release_work_order(token, wo_id)


@router.post("/work-orders/{wo_id}/start", response_model=dict)
async def start_work_order_endpoint(
    wo_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await start_work_order(token, wo_id)


@router.post("/work-orders/{wo_id}/complete", response_model=dict)
async def complete_work_order_endpoint(
    wo_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await complete_work_order(token, wo_id)


@router.post("/work-orders/{wo_id}/cancel", response_model=dict)
async def cancel_work_order_endpoint(
    wo_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await cancel_work_order(token, wo_id)


@router.post("/work-orders/{wo_id}/issue-material", response_model=dict)
async def issue_work_order_material_endpoint(
    wo_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await issue_work_order_material(token, wo_id, body)


@router.delete("/work-orders/{wo_id}", status_code=204)
async def delete_work_order_by_id(
    wo_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_work_order(token, wo_id)


@router.post("/work-orders/{wo_id}/operations/{op_id}/start", response_model=dict)
async def start_work_order_operation_endpoint(
    wo_id: int,
    op_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await start_work_order_operation(token, wo_id, op_id)


@router.post("/work-orders/{wo_id}/operations/{op_id}/complete", response_model=dict)
async def complete_work_order_operation_endpoint(
    wo_id: int,
    op_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await complete_work_order_operation(token, wo_id, op_id)

