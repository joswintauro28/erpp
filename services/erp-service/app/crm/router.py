from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import get_current_token_payload
from app.integrations import crm_client

router = APIRouter(prefix="/crm", tags=["crm-passthrough"])

VALID_ENTITIES = {
    "customers", "contacts", "documents", "opportunities", "sales",
    "requirements", "quotations", "sales-orders",
    "reports", "ai-assistant", "lead-discovery",
    "enquiries", "site-visits", "follow-ups", "tasks",
    "communications", "visit-plans", "complaints", "feedback",
    "leads",
}


def _get_token(payload: dict) -> str:
    return payload.get("_raw_token", "")


# ─── Lead Mapping ────────────────────────────────────────────

def _map_lead(l: dict) -> dict:
    return {
        "id": l.get("id"),
        "owner_id": l.get("owner_id"),
        "company_name": l.get("company"),
        "contact_person": l.get("name"),
        "email": None,
        "phone": None,
        "lead_score": 0,
        "assigned_to": None,
        "source": l.get("source"),
        "expected_value": l.get("est_value", 0),
        "status": l.get("status"),
        "gst_number": None,
        "state": None,
        "address": None,
        "website": None,
        "industry": None,
        "notes": None,
        "converted_client_id": None,
        "converted_at": None,
        "created_at": l.get("updated_at"),
    }


def _reverse_map_lead(body: dict) -> dict:
    crm_body = {}
    if "contact_person" in body:
        crm_body["name"] = body["contact_person"]
    if "company_name" in body:
        crm_body["company"] = body["company_name"]
    if "source" in body:
        crm_body["source"] = body["source"]
    if "expected_value" in body:
        crm_body["est_value"] = body["expected_value"]
    if "status" in body:
        crm_body["status"] = body["status"]
    if "notes" in body:
        crm_body["notes"] = body["notes"]
    return crm_body


def _maybe_map_leads(data: dict | list, mapper=_map_lead) -> list | dict:
    items = crm_client.extract_list(data, "leads")
    mapped = [mapper(item) for item in items]
    if isinstance(data, dict):
        data["leads"] = mapped
        return data
    return mapped


def _maybe_map_lead(item: dict | None) -> dict | None:
    if item:
        return _map_lead(item)
    return None


# ─── Reports Dashboard (specific sub-path) ────────────────────────────

@router.get("/reports/dashboard")
async def reports_dashboard(payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client._get("/reports/dashboard", token)


# ─── AI Assistant Chat (specific sub-path) ────────────────────────────

@router.post("/ai-assistant/chat")
async def ai_chat(body: dict, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.ai_assistant_chat(
        token,
        body.get("message", ""),
        body.get("history"),
    )


# ─── Lead Discovery (specific sub-paths) ──────────────────────────────

@router.post("/lead-discovery/search")
async def lead_search(body: dict, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.lead_discovery_search(token, body)


@router.post("/lead-discovery/scrape-url")
async def lead_scrape_url(body: dict, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.lead_discovery_scrape_url(token, body.get("url", ""))


@router.post("/lead-discovery/import")
async def lead_import(body: dict, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.lead_discovery_import(token, body.get("companies", []))


@router.get("/lead-discovery/pinned")
async def pinned_leads_list(payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    try:
        return await crm_client.get_pinned_leads(token)
    except Exception:
        return []


@router.post("/lead-discovery/pinned")
async def pinned_leads_create(body: dict, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.pin_lead(token, body)


@router.get("/lead-discovery/pinned/{company_name}")
async def pinned_lead_detail(company_name: str, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.get_pinned_lead(token, company_name)


@router.delete("/lead-discovery/pinned/{company_name}")
async def pinned_lead_delete(company_name: str, payload: dict = Depends(get_current_token_payload)):
    token = _get_token(payload)
    return await crm_client.unpin_lead(token, company_name)


# ─── Lead-specific endpoints ──────────────────────────────────

@router.post("/leads/{id_str}/qualify")
async def qualify_lead(
    id_str: str,
    body: dict | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._post(f"/leads/{id_str}/qualify", token, body or {})


@router.post("/leads/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    id_str = lead_id
    lead_data = None
    try:
        lead_data = await crm_client.get_entity_detail("leads", id_str, token)
    except Exception:
        pass

    if not lead_data or not id_str.startswith("lead_"):
        data = crm_client.extract_list(
            await crm_client.get_entity_list("leads", token), "leads"
        )
        for l in data:
            if str(l.get("id")) == str(lead_id) or l.get("id_str") == lead_id:
                lead_data = l
                id_str = l.get("id_str")
                break

    if not lead_data:
        raise HTTPException(status_code=404, detail="Lead not found")

    crm_body = {**lead_data, "status": "Converted"}
    try:
        result = await crm_client.update_entity("leads", id_str, token, crm_body)
        return _map_lead(result)
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")


# ─── Generic Entity List ─────────────────────────────────────

@router.get("/{entity_type}")
async def list_entities(
    entity_type: str,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")

    token = _get_token(payload)
    data = await crm_client.get_entity_list(entity_type, token)

    return data


@router.get("/{entity_type}/{id_str}")
async def get_entity(
    entity_type: str,
    id_str: str,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    data = await crm_client.get_entity_detail(entity_type, id_str, token)
    return data


@router.post("/{entity_type}")
async def create_entity(
    entity_type: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    data = await crm_client.create_entity(entity_type, token, body)
    return data


@router.put("/{entity_type}/{id_str}")
async def update_entity(
    entity_type: str,
    id_str: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    data = await crm_client.update_entity(entity_type, id_str, token, body)
    return data


@router.put("/quotations/{id}/status")
async def update_quotation_status(
    id: int,
    status: str = Query(...),
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client.update_quotation_status(id, status, token)


@router.get("/quotations/{id}/approval")
async def get_quotation_approval(
    id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._get(f"/quotations/{id}/approval", token)


@router.put("/quotations/{id}/approval")
async def decide_quotation_approval(
    id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._put(f"/quotations/{id}/approval", token, body)


@router.post("/opportunities/{id_str}/stage")
async def update_opportunity_stage(
    id_str: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._post(f"/opportunities/{id_str}/stage", token, body)


@router.post("/sales-orders/{id_str}/approve")
async def approve_sales_order(
    id_str: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._post(f"/sales-orders/{id_str}/approve", token, {})


@router.post("/sales-orders/{id_str}/check-stock")
async def check_sales_order_stock(
    id_str: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client.check_sales_order_stock(id_str, token)


@router.post("/quotations/{id}/convert")
async def convert_quotation_to_invoice(
    id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = _get_token(payload)
    return await crm_client._post(f"/quotations/{id}/convert", token, {})


@router.delete("/{entity_type}/{id_str}")
async def delete_entity(
    entity_type: str,
    id_str: str,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    return await crm_client.delete_entity(entity_type, id_str, token)
