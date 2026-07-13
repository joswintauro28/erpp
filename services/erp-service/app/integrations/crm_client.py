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
    return data.get("customers", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_leads(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/leads", token, params)
    return data.get("leads", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_opportunities(token: str) -> list[dict]:
    data = await _get("/opportunities", token)
    return data.get("opportunities", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_sales(token: str) -> list[dict]:
    data = await _get("/sales", token)
    return data.get("sales", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_contacts(token: str) -> list[dict]:
    data = await _get("/contacts", token)
    return data.get("contacts", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_complaints(token: str) -> list[dict]:
    data = await _get("/complaints", token)
    return data.get("complaints", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def get_enquiries(token: str) -> list[dict]:
    data = await _get("/enquiries", token)
    return data.get("enquiries", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])


async def _post(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{CRM_SERVICE_URL}{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _put(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(f"{CRM_SERVICE_URL}{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _delete(path: str, token: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(f"{CRM_SERVICE_URL}{path}", headers=headers)
        resp.raise_for_status()


async def create_customer(token: str, data: dict) -> dict:
    return await _post("/customers", token, data)


async def update_customer(token: str, id_str: str, data: dict) -> dict:
    return await _put(f"/customers/{id_str}", token, data)


async def delete_customer(token: str, id_str: str) -> None:
    await _delete(f"/customers/{id_str}", token)


async def create_lead_crm(token: str, data: dict) -> dict:
    return await _post("/leads", token, data)


async def update_lead_crm(token: str, id_str: str, data: dict) -> dict:
    return await _put(f"/leads/{id_str}", token, data)


async def delete_lead_crm(token: str, id_str: str) -> None:
    await _delete(f"/leads/{id_str}", token)


async def get_customer_detail(token: str, id_str: str) -> dict:
    return await _get(f"/customers/{id_str}", token)


async def get_lead_detail(token: str, id_str: str) -> dict:
    return await _get(f"/leads/{id_str}", token)

