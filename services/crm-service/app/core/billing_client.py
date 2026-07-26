import httpx
from fastapi import HTTPException
from app.core.config import settings

BILLING_BASE = f"{settings.BILLING_SERVICE_URL}/api"


async def _get_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=5.0)


def _handle_billing_error(e: Exception):
    if isinstance(e, httpx.HTTPError):
        status_code = e.response.status_code if e.response else 502
        try:
            detail = e.response.json().get("detail", "Billing Service Error")
        except Exception:
            detail = e.response.text if e.response else "Billing Service Unavailable"
        raise HTTPException(status_code=status_code, detail=detail)
    raise HTTPException(status_code=502, detail=f"Billing Service Unavailable: {str(e)}")


async def quotations_list(token: str):
    try:
        async with await _get_client() as client:
            resp = await client.get(
                f"{BILLING_BASE}/invoices/quotations",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        return []


async def quotations_get(token: str, id: int):
    try:
        async with await _get_client() as client:
            resp = await client.get(
                f"{BILLING_BASE}/invoices/quotations/{id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_billing_error(e)


async def quotations_create(token: str, payload: dict):
    try:
        async with await _get_client() as client:
            resp = await client.post(
                f"{BILLING_BASE}/invoices/quotations",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_billing_error(e)


async def quotations_update(token: str, id: int, payload: dict):
    try:
        async with await _get_client() as client:
            resp = await client.put(
                f"{BILLING_BASE}/invoices/quotations/{id}",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_billing_error(e)


async def quotations_update_status(token: str, id: int, status: str):
    try:
        async with await _get_client() as client:
            resp = await client.put(
                f"{BILLING_BASE}/invoices/quotations/{id}/status",
                params={"status": status},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_billing_error(e)


async def quotations_delete(token: str, id: int):
    try:
        async with await _get_client() as client:
            resp = await client.delete(
                f"{BILLING_BASE}/invoices/quotations/{id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json() if resp.status_code != 204 else None
    except Exception as e:
        _handle_billing_error(e)


async def quotations_convert_to_invoice(token: str, id: int):
    try:
        async with await _get_client() as client:
            resp = await client.post(
                f"{BILLING_BASE}/invoices/quotations/{id}/convert",
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        _handle_billing_error(e)
