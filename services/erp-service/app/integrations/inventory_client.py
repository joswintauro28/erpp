import os
import httpx
from typing import Any

INVENTORY_SERVICE_URL = os.environ.get("INVENTORY_SERVICE_URL", "http://localhost:8004")


async def _get(path: str, token: str, params: dict | None = None) -> Any:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{INVENTORY_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _post(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{INVENTORY_SERVICE_URL}{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _put(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(f"{INVENTORY_SERVICE_URL}{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _delete(path: str, token: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(f"{INVENTORY_SERVICE_URL}{path}", headers=headers)
        resp.raise_for_status()


# ─── Dashboard ───────────────────────────────────────────────

async def get_dashboard_inventory(token: str) -> dict:
    return await _get("/dashboard/inventory", token)


async def get_low_stock_products(token: str, limit: int = 10) -> list[dict]:
    data = await _get("/dashboard/inventory/low-stock", token, {"limit": str(limit)})
    return data if isinstance(data, list) else []


async def get_stock_movements_dashboard(token: str, limit: int = 10) -> list[dict]:
    data = await _get("/dashboard/inventory/movements", token, {"limit": str(limit)})
    return data if isinstance(data, list) else []


# ─── Products ────────────────────────────────────────────────

async def get_products(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/products", token, params)
    return data if isinstance(data, list) else []


async def get_product(token: str, product_id: int) -> dict:
    return await _get(f"/products/{product_id}", token)


async def create_product_inv(token: str, data: dict) -> dict:
    return await _post("/products", token, data)


async def update_product_inv(token: str, product_id: int, data: dict) -> dict:
    return await _put(f"/products/{product_id}", token, data)


async def delete_product_inv(token: str, product_id: int) -> None:
    await _delete(f"/products/{product_id}", token)


# ─── Warehouses ──────────────────────────────────────────────

async def get_warehouses(token: str) -> list[dict]:
    data = await _get("/warehouses", token)
    return data if isinstance(data, list) else []


async def get_warehouse(token: str, warehouse_id: int) -> dict:
    return await _get(f"/warehouses/{warehouse_id}", token)


async def create_warehouse(token: str, body: dict) -> dict:
    return await _post("/warehouses", token, body)


async def update_warehouse(token: str, warehouse_id: int, body: dict) -> dict:
    return await _put(f"/warehouses/{warehouse_id}", token, body)


async def delete_warehouse(token: str, warehouse_id: int) -> None:
    await _delete(f"/warehouses/{warehouse_id}", token)


# ─── Stock ───────────────────────────────────────────────────

async def get_stock(token: str) -> list[dict]:
    data = await _get("/stock", token)
    return data if isinstance(data, list) else []


async def adjust_stock(token: str, body: dict) -> dict:
    return await _put("/stock/adjust", token, body)


# ─── Stock Movements ─────────────────────────────────────────

async def get_stock_movements(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/stock/movements", token, params)
    return data if isinstance(data, list) else []


async def create_stock_movement(token: str, body: dict) -> dict:
    return await _post("/stock/movements", token, body)


# ─── Suppliers ───────────────────────────────────────────────

async def get_suppliers(token: str) -> list[dict]:
    data = await _get("/suppliers", token)
    return data if isinstance(data, list) else []


async def get_supplier(token: str, supplier_id: int) -> dict:
    return await _get(f"/suppliers/{supplier_id}", token)


async def create_supplier(token: str, body: dict) -> dict:
    return await _post("/suppliers", token, body)


async def update_supplier(token: str, supplier_id: int, body: dict) -> dict:
    return await _put(f"/suppliers/{supplier_id}", token, body)


async def delete_supplier(token: str, supplier_id: int) -> None:
    await _delete(f"/suppliers/{supplier_id}", token)


# ─── Purchase Orders ─────────────────────────────────────────

async def get_purchase_orders(token: str) -> list[dict]:
    data = await _get("/purchase-orders", token)
    return data if isinstance(data, list) else []


async def get_purchase_order(token: str, po_id: int) -> dict:
    return await _get(f"/purchase-orders/{po_id}", token)


async def create_purchase_order(token: str, body: dict) -> dict:
    return await _post("/purchase-orders", token, body)


async def update_purchase_order_status(token: str, po_id: int, status: str) -> dict:
    return await _put(f"/purchase-orders/{po_id}/status", token, {"status": status})


async def delete_purchase_order(token: str, po_id: int) -> None:
    await _delete(f"/purchase-orders/{po_id}", token)


# ─── Serial Numbers ──────────────────────────────────────────

async def get_serial_numbers(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/serial-numbers", token, params)
    return data if isinstance(data, list) else []


async def get_serial_number(token: str, serial_id: int) -> dict:
    return await _get(f"/serial-numbers/{serial_id}", token)


async def create_serial_number(token: str, body: dict) -> dict:
    return await _post("/serial-numbers", token, body)


async def update_serial_number(token: str, serial_id: int, body: dict) -> dict:
    return await _put(f"/serial-numbers/{serial_id}", token, body)


async def delete_serial_number(token: str, serial_id: int) -> None:
    await _delete(f"/serial-numbers/{serial_id}", token)


# ─── Fulfillment ──────────────────────────────────────────────

async def get_fulfillment_orders(token: str, status: str | None = None) -> list[dict]:
    params = {"status": status} if status else None
    data = await _get("/fulfillment/orders", token, params)
    return data if isinstance(data, list) else []


async def get_fulfillment_order(token: str, fulfillment_id: int) -> dict:
    return await _get(f"/fulfillment/orders/{fulfillment_id}", token)


async def create_fulfillment_order(token: str, body: dict) -> dict:
    return await _post("/fulfillment/orders", token, body)


async def check_fulfillment_stock(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/check-stock", token, {})


async def reserve_fulfillment_stock(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/reserve", token, {})


async def pick_fulfillment_items(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/pick-list", token, {})


async def pack_fulfillment_items(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/pack", token, {})


async def dispatch_fulfillment_order(token: str, fulfillment_id: int, body: dict) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/dispatch", token, body)


async def step_back_fulfillment_order(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/step-back", token, {})


async def trigger_po_for_fulfillment_shortage(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/create-po-shortage", token, {})


async def generate_invoice_for_fulfillment(token: str, fulfillment_id: int) -> dict:
    return await _post(f"/fulfillment/orders/{fulfillment_id}/generate-invoice", token, {})


async def delete_fulfillment_order(token: str, fulfillment_id: int) -> None:
    await _delete(f"/fulfillment/orders/{fulfillment_id}", token)


async def create_fulfillment_batch(token: str, body: dict) -> dict:
    return await _post("/fulfillment/batches", token, body)


# ─── Serial Numbers Extra ──────────────────────────────────────

async def get_serial_numbers_stats(token: str) -> dict:
    return await _get("/serial-numbers/stats", token)


# ─── Purchase Orders Extra ─────────────────────────────────────

async def putaway_purchase_order(token: str, po_id: int, body: dict) -> dict:
    return await _post(f"/purchase-orders/{po_id}/putaway", token, body)


# ─── Purchase Requisitions ────────────────────────────────────

async def get_purchase_requisitions(token: str, status: str | None = None) -> list[dict]:
    params = {"status": status} if status else None
    data = await _get("/purchase-requisitions", token, params)
    return data if isinstance(data, list) else []


async def create_purchase_requisition(token: str, body: dict) -> dict:
    return await _post("/purchase-requisitions", token, body)


async def submit_purchase_requisition(token: str, pr_id: int) -> dict:
    return await _post(f"/purchase-requisitions/{pr_id}/submit", token, {})


async def approve_purchase_requisition(token: str, pr_id: int) -> dict:
    return await _post(f"/purchase-requisitions/{pr_id}/approve", token, {})


async def reject_purchase_requisition(token: str, pr_id: int) -> dict:
    return await _post(f"/purchase-requisitions/{pr_id}/reject", token, {})


async def convert_purchase_requisition_to_po(token: str, pr_id: int, body: dict) -> dict:
    return await _post(f"/purchase-requisitions/{pr_id}/convert", token, body)


async def delete_purchase_requisition(token: str, pr_id: int) -> None:
    await _delete(f"/purchase-requisitions/{pr_id}", token)


# ─── Quality Checks ───────────────────────────────────────────

async def get_quality_checks(token: str, status: str | None = None) -> list[dict]:
    params = {"status": status} if status else None
    data = await _get("/quality-checks", token, params)
    return data if isinstance(data, list) else []


async def create_quality_check(token: str, body: dict) -> dict:
    return await _post("/quality-checks", token, body)


async def record_quality_check_result(token: str, qc_id: int, body: dict) -> dict:
    return await _put(f"/quality-checks/{qc_id}/result", token, body)


# ─── Work Orders ──────────────────────────────────────────────

async def get_work_orders(token: str, status: str | None = None) -> list[dict]:
    params = {"status": status} if status else None
    data = await _get("/work-orders", token, params)
    return data if isinstance(data, list) else []


async def create_work_order(token: str, body: dict) -> dict:
    return await _post("/work-orders", token, body)


async def release_work_order(token: str, wo_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/release", token, {})


async def start_work_order(token: str, wo_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/start", token, {})


async def complete_work_order(token: str, wo_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/complete", token, {})


async def cancel_work_order(token: str, wo_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/cancel", token, {})


async def issue_work_order_material(token: str, wo_id: int, body: dict) -> dict:
    return await _post(f"/work-orders/{wo_id}/issue-material", token, body)


async def delete_work_order(token: str, wo_id: int) -> None:
    await _delete(f"/work-orders/{wo_id}", token)


async def start_work_order_operation(token: str, wo_id: int, op_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/operations/{op_id}/start", token, {})


async def complete_work_order_operation(token: str, wo_id: int, op_id: int) -> dict:
    return await _post(f"/work-orders/{wo_id}/operations/{op_id}/complete", token, {})

