import httpx

# CRM microservice is at services/crm-service (FastAPI, port 8001).
# Router prefixes use /api, paths here combine with CRM_SERVICE_URL accordingly.
CRM_SERVICE_URL = "http://localhost:8001/api"


async def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{CRM_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def get_dashboard_crm(token: str) -> dict:
    return await _get("/dashboard", token)


async def get_customers(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/customers", token, params)
    return data if isinstance(data, list) else []


async def get_leads(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/leads", token, params)
    return data if isinstance(data, list) else []
