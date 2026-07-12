from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.crm_client import _get

router = APIRouter(prefix="/crm", tags=["crm-passthrough"])


@router.get("/customers")
async def get_customers(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await _get("/customers", token)
