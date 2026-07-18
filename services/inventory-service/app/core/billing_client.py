import httpx

from app.core.config import settings

BILLING_SERVICE_URL = "http://localhost:8003/api"


async def trigger_vendor_bill(
    token: str,
    organization_id: int,
    po: dict,
    supplier_name: str,
) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    items = []
    for item in po.get("items", []):
        items.append({
            "productId": item.get("product_id"),
            "description": item.get("description", f"Product #{item.get('product_id', '')}"),
            "quantity": item.get("quantity", 1),
            "unitPrice": float(item.get("unit_price", 0) or 0),
            "gstRate": float(item.get("gst_rate", 0) or 0),
        })

    if not items:
        items.append({
            "description": f"Purchase Order {po.get('order_number', '')}",
            "quantity": 1,
            "unitPrice": float(po.get("total", po.get("subtotal", 0)) or 0),
            "gstRate": 0,
        })

    body = {
        "organizationId": organization_id,
        "vendorId": po.get("supplier_id", 0),
        "vendorName": supplier_name,
        "poReference": po.get("order_number", ""),
        "items": items,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{BILLING_SERVICE_URL}/internal/billing/trigger-vendor-bill",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        return resp.json()
