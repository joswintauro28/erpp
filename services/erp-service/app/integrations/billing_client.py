import os
import httpx
from typing import Any

BILLING_SERVICE_URL = os.environ.get("BILLING_SERVICE_URL", "http://localhost:8003/api")


async def _get(path: str, token: str, params: dict | None = None) -> Any:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BILLING_SERVICE_URL}{path}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _post(path: str, token: str, body: dict | None = None) -> Any:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{BILLING_SERVICE_URL}{path}", headers=headers, json=body or {})
        resp.raise_for_status()
        return resp.json()


async def _put(path: str, token: str, body: dict | None = None) -> Any:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(f"{BILLING_SERVICE_URL}{path}", headers=headers, json=body or {})
        resp.raise_for_status()
        return resp.json()


async def _patch(path: str, token: str, body: dict | None = None) -> Any:
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.patch(f"{BILLING_SERVICE_URL}{path}", headers=headers, json=body or {})
        resp.raise_for_status()
        return resp.json()


async def _delete(path: str, token: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(f"{BILLING_SERVICE_URL}{path}", headers=headers)
        resp.raise_for_status()


# ─── Dashboard ───────────────────────────────────────────────

async def get_dashboard_billing(token: str) -> dict:
    return await _get("/dashboard/billing", token)


# ─── Invoices ────────────────────────────────────────────────

async def get_invoices(token: str, params: dict | None = None) -> list[dict]:
    data = await _get("/invoices", token, params)
    return data if isinstance(data, list) else []


async def get_invoice(token: str, invoice_id: int) -> dict:
    return await _get(f"/invoices/{invoice_id}", token)


async def create_invoice(token: str, body: dict) -> dict:
    return await _post("/invoices", token, body)


async def create_invoice_from_dispatch(token: str, body: dict) -> dict:
    return await _post("/invoices/from-dispatch", token, body)


async def update_invoice_status(token: str, invoice_id: int, status: str) -> dict:
    return await _put(f"/invoices/{invoice_id}/status", token, {"status": status})


async def delete_invoice(token: str, invoice_id: int) -> None:
    await _delete(f"/invoices/{invoice_id}", token)


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


# ─── Quotations ──────────────────────────────────────────────

async def get_quotations(token: str) -> list[dict]:
    data = await _get("/invoices/quotations", token)
    return data if isinstance(data, list) else []


async def get_quotation(token: str, quotation_id: int) -> dict:
    return await _get(f"/invoices/quotations/{quotation_id}", token)


async def create_quotation(token: str, body: dict) -> dict:
    return await _post("/invoices/quotations", token, body)


async def update_quotation(token: str, quotation_id: int, body: dict) -> dict:
    return await _put(f"/invoices/quotations/{quotation_id}", token, body)


async def update_quotation_status(token: str, quotation_id: int, status: str) -> dict:
    return await _put(f"/invoices/quotations/{quotation_id}/status", token, {"status": status})


async def convert_quotation(token: str, quotation_id: int) -> dict:
    return await _post(f"/invoices/quotations/{quotation_id}/convert", token)


async def delete_quotation(token: str, quotation_id: int) -> None:
    await _delete(f"/invoices/quotations/{quotation_id}", token)


# ─── Credit Notes ────────────────────────────────────────────

async def get_credit_notes(token: str) -> list[dict]:
    data = await _get("/invoices/credit-notes", token)
    return data if isinstance(data, list) else []


async def create_credit_note(token: str, body: dict) -> dict:
    return await _post("/invoices/credit-notes", token, body)


async def delete_credit_note(token: str, note_id: int) -> None:
    await _delete(f"/invoices/credit-notes/{note_id}", token)


# ─── Debit Notes ─────────────────────────────────────────────

async def get_debit_notes(token: str) -> list[dict]:
    data = await _get("/invoices/debit-notes", token)
    return data if isinstance(data, list) else []


async def create_debit_note(token: str, body: dict) -> dict:
    return await _post("/invoices/debit-notes", token, body)


async def delete_debit_note(token: str, note_id: int) -> None:
    await _delete(f"/invoices/debit-notes/{note_id}", token)


# ─── Recurring Invoices ──────────────────────────────────────

async def get_recurring_invoices(token: str) -> list[dict]:
    data = await _get("/invoices/recurring", token)
    return data if isinstance(data, list) else []


async def get_recurring_invoice(token: str, rec_id: int) -> dict:
    return await _get(f"/invoices/recurring/{rec_id}", token)


async def create_recurring_invoice(token: str, body: dict) -> dict:
    return await _post("/invoices/recurring", token, body)


async def update_recurring_invoice(token: str, rec_id: int, body: dict) -> dict:
    return await _put(f"/invoices/recurring/{rec_id}", token, body)


async def delete_recurring_invoice(token: str, rec_id: int) -> None:
    await _delete(f"/invoices/recurring/{rec_id}", token)


# ─── Payments ────────────────────────────────────────────────

async def get_payments(token: str) -> list[dict]:
    data = await _get("/payments", token)
    return data if isinstance(data, list) else []


async def create_payment(token: str, body: dict) -> dict:
    return await _post("/payments", token, body)


async def refund_payment(token: str, payment_id: int) -> dict:
    return await _post(f"/payments/{payment_id}/refund", token)


async def get_payments_metrics(token: str) -> dict:
    return await _get("/payments/metrics", token)


# ─── Accounting ───────────────────────────────────────────────

async def get_accounts(token: str) -> dict:
    return await _get("/accounts", token)


async def get_expenses(token: str) -> dict:
    return await _get("/expenses", token)


async def create_account(token: str, body: dict) -> dict:
    return await _post("/accounts", token, body)


async def update_account(token: str, account_id: int, body: dict) -> dict:
    return await _put(f"/accounts/{account_id}", token, body)


async def create_expense(token: str, body: dict) -> dict:
    return await _post("/expenses", token, body)


async def delete_expense(token: str, expense_id: int) -> None:
    await _delete(f"/expenses/{expense_id}", token)


async def create_expense_from_po(token: str, body: dict) -> dict:
    return await _post("/expenses/from-po", token, body)


async def get_ledger(token: str) -> dict:
    return await _get("/ledger", token)


async def get_reports(token: str) -> dict:
    return await _get("/reports", token)


async def get_aging(token: str) -> dict:
    return await _get("/aging", token)


async def get_dunning(token: str) -> dict:
    return await _get("/dunning", token)


# ─── Bank Reconciliation ────────────────────────────────────

async def import_bank_csv(token: str, body: dict) -> dict:
    return await _post("/bank-reconciliation/import", token, body)


async def get_bank_transactions(token: str, batch: str | None = None) -> dict:
    params = {"batch": batch} if batch else None
    return await _get("/bank-reconciliation/transactions", token, params)


async def match_bank_transaction(token: str, body: dict) -> dict:
    return await _post("/bank-reconciliation/match", token, body)


async def get_bank_reports(token: str) -> dict:
    return await _get("/bank-reconciliation/reports", token)


# ─── Month-End Close / Fiscal Periods ───────────────────────

async def get_periods(token: str) -> dict:
    return await _get("/periods", token)


async def close_period(token: str, period_id: int) -> dict:
    return await _post(f"/periods/{period_id}/close", token)


async def reopen_period(token: str, period_id: int) -> dict:
    return await _post(f"/periods/{period_id}/reopen", token)


async def get_periods_status(token: str) -> dict:
    return await _get("/periods/status", token)
