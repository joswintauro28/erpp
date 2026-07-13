from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.crm_client import get_leads, get_lead_detail, create_lead_crm, update_lead_crm, delete_lead_crm

router = APIRouter(prefix="/leads", tags=["leads"])


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


@router.get("", response_model=list[dict])
async def list_leads(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    data = await get_leads(token)
    return [_map_lead(l) for l in data]


@router.post("", response_model=dict, status_code=201)
async def create_lead(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    crm_body = {
        "name": body.get("contact_person", ""),
        "company": body.get("company_name", ""),
        "source": body.get("source", "Website"),
        "est_value": body.get("expected_value", 0),
        "status": body.get("status", "New"),
    }
    result = await create_lead_crm(token, crm_body)
    return _map_lead(result)


@router.get("/{lead_id}", response_model=dict)
async def get_lead(
    lead_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    try:
        res = await get_lead_detail(token, lead_id)
        if res:
            return _map_lead(res)
    except Exception:
        pass

    data = await get_leads(token)
    for l in data:
        if str(l.get("id")) == str(lead_id) or l.get("id_str") == lead_id:
            return _map_lead(l)
    from app.core.exceptions import NotFoundException
    raise NotFoundException("Lead not found")


@router.put("/{lead_id}", response_model=dict)
async def update_lead(
    lead_id: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    id_str = lead_id
    if not id_str.startswith("lead_"):
        data = await get_leads(token)
        found = False
        for l in data:
            if str(l.get("id")) == str(lead_id) or l.get("id_str") == lead_id:
                id_str = l.get("id_str")
                found = True
                break
        if not found:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Lead not found")

    crm_body = {}
    if "company_name" in body:
        crm_body["company"] = body["company_name"]
    if "contact_person" in body:
        crm_body["name"] = body["contact_person"]
    if "source" in body:
        crm_body["source"] = body["source"]
    if "expected_value" in body:
        crm_body["est_value"] = body["expected_value"]
    if "status" in body:
        crm_body["status"] = body["status"]

    try:
        result = await update_lead_crm(token, id_str, crm_body)
        return _map_lead(result)
    except Exception:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Lead not found")


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    id_str = lead_id
    if not id_str.startswith("lead_"):
        data = await get_leads(token)
        found = False
        for l in data:
            if str(l.get("id")) == str(lead_id) or l.get("id_str") == lead_id:
                id_str = l.get("id_str")
                found = True
                break
        if not found:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Lead not found")

    try:
        await delete_lead_crm(token, id_str)
    except Exception:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Lead not found")


@router.post("/{lead_id}/convert", response_model=dict)
async def convert_lead(
    lead_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    id_str = lead_id
    lead_data = None
    try:
        lead_data = await get_lead_detail(token, id_str)
    except Exception:
        pass

    if not lead_data or not id_str.startswith("lead_"):
        data = await get_leads(token)
        for l in data:
            if str(l.get("id")) == str(lead_id) or l.get("id_str") == lead_id:
                lead_data = l
                id_str = l.get("id_str")
                break

    if not lead_data:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Lead not found")

    crm_body = {**lead_data, "status": "Converted"}
    try:
        result = await update_lead_crm(token, id_str, crm_body)
        return _map_lead(result)
    except Exception:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Lead not found")
