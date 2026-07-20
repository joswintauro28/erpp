import os
import httpx

CRM_SERVICE_URL = os.environ.get("CRM_SERVICE_URL", "http://localhost:8001")


async def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{CRM_SERVICE_URL}/api{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _post(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{CRM_SERVICE_URL}/api{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _put(path: str, token: str, body: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.put(f"{CRM_SERVICE_URL}/api{path}", headers=headers, json=body)
        resp.raise_for_status()
        return resp.json()


async def _delete(path: str, token: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.delete(f"{CRM_SERVICE_URL}/api{path}", headers=headers)
        resp.raise_for_status()
        return resp.json() if resp.content else {"status": "success"}


# ─── Generic Entity CRUD ──────────────────────────────────────────────

async def get_entity_list(entity_type: str, token: str, params: dict | None = None) -> dict:
    return await _get(f"/{entity_type}", token, params)


async def get_entity_detail(entity_type: str, id_str: str, token: str) -> dict:
    return await _get(f"/{entity_type}/{id_str}", token)


async def create_entity(entity_type: str, token: str, data: dict) -> dict:
    return await _post(f"/{entity_type}", token, data)


async def update_entity(entity_type: str, id_str: str, token: str, data: dict) -> dict:
    return await _put(f"/{entity_type}/{id_str}", token, data)


async def delete_entity(entity_type: str, id_str: str, token: str) -> dict:
    return await _delete(f"/{entity_type}/{id_str}", token)


# ─── Response Helpers ──────────────────────────────────────────────────

def extract_list(data: dict | list | None, key: str) -> list:
    if isinstance(data, dict):
        return data.get(key, [])
    if isinstance(data, list):
        return data
    return []


# ─── Specific Entity Functions (convenience wrappers) ─────────────────

async def get_dashboard_crm(token: str) -> dict:
    return await get_entity_list("dashboard", token)


async def get_customers(token: str) -> dict:
    return await get_entity_list("customers", token)


async def get_customer_detail(token: str, id_str: str) -> dict:
    return await get_entity_detail("customers", id_str, token)


async def create_customer(token: str, data: dict) -> dict:
    return await create_entity("customers", token, data)


async def update_customer(token: str, id_str: str, data: dict) -> dict:
    return await update_entity("customers", id_str, token, data)


async def delete_customer(token: str, id_str: str) -> dict:
    return await delete_entity("customers", id_str, token)


async def get_leads(token: str) -> dict:
    return await get_entity_list("leads", token)


async def get_lead_detail(token: str, id_str: str) -> dict:
    return await get_entity_detail("leads", id_str, token)


async def create_lead_crm(token: str, data: dict) -> dict:
    return await create_entity("leads", token, data)


async def update_lead_crm(token: str, id_str: str, data: dict) -> dict:
    return await update_entity("leads", id_str, token, data)


async def delete_lead_crm(token: str, id_str: str) -> dict:
    return await delete_entity("leads", id_str, token)


# ─── AI Assistant ─────────────────────────────────────────────────────

async def ai_assistant_chat(token: str, message: str, history: list | None = None) -> dict:
    body = {"message": message}
    if history:
        body["history"] = history
    return await _post("/ai-assistant/chat", token, body)


# ─── Lead Discovery ────────────────────────────────────────────────────

async def lead_discovery_search(token: str, params: dict) -> dict:
    return await _post("/lead-discovery/search", token, params)


async def lead_discovery_scrape_url(token: str, url: str) -> dict:
    return await _post("/lead-discovery/scrape-url", token, {"url": url})


async def lead_discovery_import(token: str, companies: list) -> dict:
    return await _post("/lead-discovery/import", token, {"companies": companies})


async def get_pinned_leads(token: str) -> list:
    return await _get("/lead-discovery/pinned", token)


async def get_pinned_lead(token: str, company_name: str) -> dict:
    from urllib.parse import quote
    return await _get(f"/lead-discovery/pinned/{quote(company_name)}", token)


async def pin_lead(token: str, company: dict) -> dict:
    return await _post("/lead-discovery/pinned", token, company)


async def unpin_lead(token: str, company_name: str) -> dict:
    from urllib.parse import quote
    return await _delete(f"/lead-discovery/pinned/{quote(company_name)}", token)
