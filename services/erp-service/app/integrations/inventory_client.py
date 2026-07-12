import httpx

INVENTORY_SERVICE_URL = "http://localhost:8004"


async def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{INVENTORY_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def get_dashboard_inventory(token: str) -> dict:
    return await _get("/dashboard/inventory", token)


async def get_low_stock_products(token: str, limit: int = 10) -> list[dict]:
    data = await _get("/dashboard/inventory/low-stock", token, {"limit": str(limit)})
    return data if isinstance(data, list) else []


async def get_stock_movements(token: str, limit: int = 10) -> list[dict]:
    data = await _get("/dashboard/inventory/movements", token, {"limit": str(limit)})
    return data if isinstance(data, list) else []


async def get_warehouses(token: str) -> list[dict]:
    data = await _get("/warehouses", token)
    return data if isinstance(data, list) else []


async def get_products(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/products", token, params)
    return data if isinstance(data, list) else []


async def get_suppliers(token: str) -> list[dict]:
    data = await _get("/suppliers", token)
    return data if isinstance(data, list) else []


async def get_purchase_orders(token: str) -> list[dict]:
    data = await _get("/purchase-orders", token)
    return data if isinstance(data, list) else []


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


async def create_product_inv(token: str, data: dict) -> dict:
    return await _post("/products", token, data)


async def update_product_inv(token: str, product_id: int, data: dict) -> dict:
    return await _put(f"/products/{product_id}", token, data)


async def delete_product_inv(token: str, product_id: int) -> None:
    await _delete(f"/products/{product_id}", token)
