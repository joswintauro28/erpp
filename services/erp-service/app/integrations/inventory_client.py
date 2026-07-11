import httpx

INVENTORY_SERVICE_URL = "http://localhost:8004"


async def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{INVENTORY_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def get_dashboard_inventory(token: str) -> dict:
    return await _get("/dashboard", token)


async def get_products(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/products", token, params)
    return data if isinstance(data, list) else []


async def get_warehouses(token: str) -> list[dict]:
    data = await _get("/warehouses", token)
    return data if isinstance(data, list) else []
