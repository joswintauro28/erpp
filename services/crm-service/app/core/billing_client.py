import httpx

BILLING_SERVICE_URL = "http://localhost:8003/api"


async def push_quotation_to_billing(token: str, crm_quotation: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    body = {
        "clientId": 0,
        "clientName": crm_quotation.get("account", ""),
        "quotationNumber": f"CRM-{crm_quotation.get('quote_no', crm_quotation.get('id_str', ''))}",
        "validUntil": crm_quotation.get("valid_until", None),
        "items": [
            {
                "description": f"Quotation {crm_quotation.get('quote_no', '')}",
                "quantity": 1,
                "unitPrice": float(crm_quotation.get("value", 0) or 0),
                "gstRate": 0,
            }
        ],
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{BILLING_SERVICE_URL}/invoices/quotations",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        return resp.json()
