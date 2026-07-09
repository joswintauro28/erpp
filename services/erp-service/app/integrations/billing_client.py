import httpx

BILLING_SERVICE_URL = "http://localhost:8003/api"


async def _get(path: str, token: str, params: dict | None = None) -> dict | list:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BILLING_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def get_dashboard_billing(token: str) -> dict:
    return await _get("/dashboard/billing", token)


async def get_invoices(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/invoices", token, params)
    return data if isinstance(data, list) else []


async def get_payments_metrics(token: str) -> dict:
    return await _get("/payments/metrics", token)


async def get_invoice_summary(token: str) -> dict:
    data = await _get("/invoices", token, {"limit": "1000"})
    if not isinstance(data, list):
        return {}
    counts: dict[str, int] = {}
    for inv in data:
        s = inv.get("status", "unknown")
        counts[s] = counts.get(s, 0) + 1
    total = sum(counts.values()) or 1
    return {
        s: {"count": c, "percentage": round(c / total * 100, 1)}
        for s, c in counts.items()
    }
