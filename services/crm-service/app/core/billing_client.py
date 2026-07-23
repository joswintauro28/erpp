import httpx
from app.core.config import settings

BILLING_BASE = f"{settings.BILLING_SERVICE_URL}/api"


async def _get_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=30.0)


async def quotations_list(token: str):
    async with await _get_client() as client:
        resp = await client.get(
            f"{BILLING_BASE}/invoices/quotations",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def quotations_get(token: str, id: int):
    async with await _get_client() as client:
        resp = await client.get(
            f"{BILLING_BASE}/invoices/quotations/{id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def quotations_create(token: str, payload: dict):
    async with await _get_client() as client:
        resp = await client.post(
            f"{BILLING_BASE}/invoices/quotations",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def quotations_update(token: str, id: int, payload: dict):
    async with await _get_client() as client:
        resp = await client.put(
            f"{BILLING_BASE}/invoices/quotations/{id}",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def quotations_update_status(token: str, id: int, status: str):
    async with await _get_client() as client:
        resp = await client.put(
            f"{BILLING_BASE}/invoices/quotations/{id}/status",
            params={"status": status},
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def quotations_delete(token: str, id: int):
    async with await _get_client() as client:
        resp = await client.delete(
            f"{BILLING_BASE}/invoices/quotations/{id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json() if resp.status_code != 204 else None


async def quotations_convert_to_invoice(token: str, id: int):
    async with await _get_client() as client:
        resp = await client.post(
            f"{BILLING_BASE}/invoices/quotations/{id}/convert",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()
