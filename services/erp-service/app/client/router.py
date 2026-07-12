from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.crm_client import get_customers, create_customer, update_customer, delete_customer

router = APIRouter(prefix="/clients", tags=["clients"])


def _map_customer(c: dict) -> dict:
    return {
        "id": c.get("id"),
        "name": c.get("name") or c.get("account") or f"Client #{c.get('id')}",
        "email": c.get("email"),
        "phone": c.get("phone"),
        "address": c.get("address"),
        "gst_number": None,
        "state": None,
        "notes": c.get("notes"),
        "created_at": c.get("updated_at") or c.get("created_at"),
    }


@router.get("", response_model=list[dict])
async def list_clients(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    data = await get_customers(token)
    return [_map_customer(c) for c in data]


@router.post("", response_model=dict, status_code=201)
async def create_client(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    crm_body = {"account": body.get("name", "")}
    if body.get("email"):
        crm_body["email"] = body["email"]
    if body.get("phone"):
        crm_body["phone"] = body["phone"]
    if body.get("notes"):
        crm_body["notes"] = body["notes"]
    result = await create_customer(token, crm_body)
    return _map_customer(result)


@router.get("/{client_id}", response_model=dict)
async def get_client(
    client_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    data = await get_customers(token)
    for c in data:
        if str(c.get("id")) == str(client_id) or c.get("id_str") == client_id:
            return _map_customer(c)
    from app.core.exceptions import NotFoundException
    raise NotFoundException("Client not found")


@router.put("/{client_id}", response_model=dict)
async def update_client(
    client_id: str,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    data = await get_customers(token)
    id_str = None
    for c in data:
        if str(c.get("id")) == str(client_id) or c.get("id_str") == client_id:
            id_str = c.get("id_str")
            break
    if not id_str:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Client not found")
    crm_body = {}
    if "name" in body:
        crm_body["account"] = body["name"]
    result = await update_customer(token, id_str, crm_body)
    return _map_customer(result)


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: str,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    data = await get_customers(token)
    id_str = None
    for c in data:
        if str(c.get("id")) == str(client_id) or c.get("id_str") == client_id:
            id_str = c.get("id_str")
            break
    if not id_str:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Client not found")
    await delete_customer(token, id_str)
