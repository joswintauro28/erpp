import httpx
from fastapi import HTTPException
from app.core.config import settings

INVENTORY_BASE = settings.INVENTORY_SERVICE_URL


async def _get_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=5.0)


def _handle_inventory_error(e: Exception):
    if isinstance(e, httpx.HTTPError):
        status_code = e.response.status_code if e.response else 502
        try:
            detail = e.response.json().get("detail", "Inventory Service Error")
        except Exception:
            detail = e.response.text if e.response else "Inventory Service Unavailable"
        raise HTTPException(status_code=status_code, detail=detail)
    raise HTTPException(status_code=502, detail=f"Inventory Service Unavailable: {str(e)}")


async def check_stock_availability(token: str, items: list[dict], warehouse_id: int | None = None) -> dict:
    try:
        body = {
            "warehouse_id": warehouse_id,
            "items": items,
        }
        async with await _get_client() as client:
            resp = await client.post(
                f"{INVENTORY_BASE}/stock/check",
                json=body,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_inventory_error(e)
