from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_token_payload
from app.integrations import crm_client

router = APIRouter(prefix="/crm", tags=["crm-passthrough"])

VALID_ENTITIES = {
    "customers", "contacts", "documents", "opportunities",
    "requirements", "quotations", "sales-orders",
    "reports", "ai-assistant", "lead-discovery",
}


def _get_token(payload: dict) -> str:
    return payload.get("_raw_token", "")


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


# ─── Generic Entity List ─────────────────────────────────────────────

@router.get("/{entity_type}")
async def list_entities(
    entity_type: str,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")

    # Quotations are not yet implemented in crm-service; return empty data
    if entity_type == "quotations":
        return {
            "summary": {"total_quotations": 0, "open": 0, "overdue_at_risk": 0, "owners": 0},
            "quotations": [],
        }

    token = _get_token(payload)
    return await crm_client.get_entity_list(entity_type, token)


@router.get("/{entity_type}/{id_str}")
async def get_entity(
    entity_type: str,
    id_str: str,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    return await crm_client.get_entity_detail(entity_type, id_str, token)


@router.post("/{entity_type}")
async def create_entity(
    entity_type: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    if entity_type not in VALID_ENTITIES:
        raise HTTPException(status_code=404, detail=f"Unknown entity type: {entity_type}")
    token = _get_token(payload)
    return await crm_client.create_entity(entity_type, token, body)


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
    return await crm_client.update_entity(entity_type, id_str, token, body)


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
