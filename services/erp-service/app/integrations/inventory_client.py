import httpx
from typing import Any

INVENTORY_SERVICE_URL = "http://localhost:8004"


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

async def get_serial_numbers(token: str) -> list[dict]:
    data = await _get("/serial-numbers", token)
    return data if isinstance(data, list) else []


async def get_serial_number(token: str, serial_id: int) -> dict:
    return await _get(f"/serial-numbers/{serial_id}", token)


async def create_serial_number(token: str, body: dict) -> dict:
    return await _post("/serial-numbers", token, body)


async def update_serial_number(token: str, serial_id: int, body: dict) -> dict:
    return await _put(f"/serial-numbers/{serial_id}", token, body)


async def delete_serial_number(token: str, serial_id: int) -> None:
    await _delete(f"/serial-numbers/{serial_id}", token)
