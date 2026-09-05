from fastapi import APIRouter, Depends, Query, Response

from app.core.deps import get_current_token_payload
from app.integrations.billing_client import (
    get_invoices, get_invoice, create_invoice, update_invoice, create_invoice_from_dispatch, update_invoice_status, delete_invoice,
    get_quotations, get_quotation, create_quotation, update_quotation,
    update_quotation_status, convert_quotation, delete_quotation,
    get_credit_notes, create_credit_note, delete_credit_note,
    get_debit_notes, create_debit_note, delete_debit_note,
    get_recurring_invoices, get_recurring_invoice, create_recurring_invoice, update_recurring_invoice, delete_recurring_invoice,
    get_payments, create_payment, refund_payment, get_payments_metrics,
    get_dashboard_billing,
    get_accounts, get_expenses, create_account, update_account, create_expense, delete_expense, create_expense_from_po, get_ledger, get_reports, get_aging, get_dunning,
    get_aging_summary, get_aging_customers, get_aging_invoices, get_aging_reconciliation, get_aging_invoice, get_aging_export,
    import_bank_csv, import_bank_file, get_bank_transactions, match_bank_transaction, reconcile_bank_transaction, unmatch_bank_transaction, get_bank_reports, get_bank_variance_report, get_bank_audit_logs, get_bank_config, update_bank_config,
    get_periods, close_period, reopen_period_request, get_periods_status,
    get_cogs_summary, get_cogs_invoices, get_cogs_products, get_cogs_ledger, get_cogs_invoice_drilldown, get_cogs_dlq,
)


router = APIRouter(tags=["billing"])


# ─── Invoices ────────────────────────────────────────────────

@router.get("/invoices", response_model=list[dict])
async def list_invoices(
    limit: int = Query(100, le=1000),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_invoices(token, {"limit": str(limit)})


@router.post("/invoices", response_model=dict, status_code=201)
async def create_new_invoice(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_invoice(token, body)


@router.post("/invoices/from-dispatch", response_model=dict, status_code=201)
async def create_invoice_from_dispatch_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_invoice_from_dispatch(token, body)


# ─── Quotations ──────────────────────────────────────────────

@router.get("/invoices/quotations", response_model=list[dict])
async def list_quotations(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_quotations(token)


@router.post("/invoices/quotations", response_model=dict, status_code=201)
async def create_new_quotation(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_quotation(token, body)


@router.get("/invoices/quotations/{quotation_id}", response_model=dict)
async def get_quotation_by_id(
    quotation_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_quotation(token, quotation_id)


@router.put("/invoices/quotations/{quotation_id}", response_model=dict)
async def update_quotation_by_id(
    quotation_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_quotation(token, quotation_id, body)


@router.put("/invoices/quotations/{quotation_id}/status", response_model=dict)
async def update_quotation_status_endpoint(
    quotation_id: int,
    status: str = Query(...),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_quotation_status(token, quotation_id, status)


@router.post("/invoices/quotations/{quotation_id}/convert", response_model=dict)
async def convert_quotation_to_invoice(
    quotation_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await convert_quotation(token, quotation_id)


@router.delete("/invoices/quotations/{quotation_id}", status_code=204)
async def delete_quotation_by_id(
    quotation_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_quotation(token, quotation_id)


# ─── Credit Notes ────────────────────────────────────────────

@router.get("/invoices/credit-notes", response_model=list[dict])
async def list_credit_notes(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_credit_notes(token)


@router.post("/invoices/credit-notes", response_model=dict, status_code=201)
async def create_new_credit_note(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_credit_note(token, body)


@router.delete("/invoices/credit-notes/{note_id}", status_code=204)
async def delete_credit_note_by_id(
    note_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_credit_note(token, note_id)


# ─── Debit Notes ─────────────────────────────────────────────

@router.get("/invoices/debit-notes", response_model=list[dict])
async def list_debit_notes(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_debit_notes(token)


@router.post("/invoices/debit-notes", response_model=dict, status_code=201)
async def create_new_debit_note(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_debit_note(token, body)


@router.delete("/invoices/debit-notes/{note_id}", status_code=204)
async def delete_debit_note_by_id(
    note_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_debit_note(token, note_id)


# ─── Recurring Invoices ──────────────────────────────────────

@router.get("/invoices/recurring", response_model=list[dict])
async def list_recurring_invoices(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_recurring_invoices(token)


@router.get("/invoices/recurring/{rec_id}", response_model=dict)
async def get_recurring_invoice_by_id(
    rec_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_recurring_invoice(token, rec_id)


@router.post("/invoices/recurring", response_model=dict, status_code=201)
async def create_new_recurring_invoice(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_recurring_invoice(token, body)


@router.put("/invoices/recurring/{rec_id}", response_model=dict)
async def update_recurring_invoice_by_id(
    rec_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_recurring_invoice(token, rec_id, body)


@router.delete("/invoices/recurring/{rec_id}", status_code=204)
async def delete_recurring_invoice_by_id(
    rec_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_recurring_invoice(token, rec_id)


# ─── Parameterized Dynamic Invoice Routes ─────────────────────

@router.get("/invoices/{invoice_id}", response_model=dict)
async def get_invoice_by_id(
    invoice_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_invoice(token, invoice_id)


@router.put("/invoices/{invoice_id}", response_model=dict)
async def update_invoice_by_id(
    invoice_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_invoice(token, invoice_id, body)


@router.put("/invoices/{invoice_id}/status", response_model=dict)
async def update_invoice_status_endpoint(
    invoice_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_invoice_status(token, invoice_id, body.get("status", ""))


@router.delete("/invoices/{invoice_id}", status_code=204)
async def delete_invoice_by_id(
    invoice_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_invoice(token, invoice_id)


# ─── Payments ────────────────────────────────────────────────

@router.get("/payments", response_model=list[dict])
async def list_payments(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_payments(token)


@router.post("/payments", response_model=dict, status_code=201)
async def create_new_payment(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_payment(token, body)


@router.post("/payments/{payment_id}/refund", response_model=dict)
async def refund_payment_by_id(
    payment_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await refund_payment(token, payment_id)


@router.get("/payments/metrics", response_model=dict)
async def list_payment_metrics(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_payments_metrics(token)


# ─── Dashboard ───────────────────────────────────────────────

@router.get("/dashboard/billing", response_model=dict)
async def billing_dashboard(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_dashboard_billing(token)


# ─── Accounting (proxied to billing-service) ─────────────────

@router.get("/accounts", response_model=dict)
async def list_accounts(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_accounts(token)


@router.post("/accounts", response_model=dict, status_code=201)
async def create_account_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_account(token, body)


@router.put("/accounts/{account_id}", response_model=dict)
async def update_account_endpoint(
    account_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_account(token, account_id, body)


@router.get("/expenses", response_model=dict)
async def list_expenses(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_expenses(token)


@router.post("/expenses", response_model=dict, status_code=201)
async def create_expense_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_expense(token, body)


@router.delete("/expenses/{expense_id}", status_code=204)
async def delete_expense_endpoint(
    expense_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_expense(token, expense_id)


@router.post("/expenses/from-po", response_model=dict, status_code=201)
async def create_expense_from_po_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_expense_from_po(token, body)


@router.get("/ledger", response_model=dict)
async def list_ledger(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_ledger(token)


@router.post("/ledger", response_model=dict, status_code=201)
async def create_ledger_entry(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await billing_client._post("/ledger", token, body)


@router.put("/ledger/{entry_id}", response_model=dict)
async def update_ledger_entry(
    entry_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await billing_client._put(f"/ledger/{entry_id}", token, body)


@router.get("/reports", response_model=dict)
async def list_reports(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_reports(token)


@router.get("/aging", response_model=dict)
async def list_aging(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_aging(token)


@router.get("/aging/summary", response_model=dict)
async def get_aging_summary_endpoint(
    as_of_date: str | None = Query(None, alias="asOfDate"),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_aging_summary(token, {"asOfDate": as_of_date} if as_of_date else None)


@router.get("/aging/customers", response_model=dict)
async def get_aging_customers_endpoint(
    as_of_date: str | None = Query(None, alias="asOfDate"),
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    search: str | None = Query(None),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    params: dict = {}
    if as_of_date: params["asOfDate"] = as_of_date
    if page: params["page"] = str(page)
    if page_size: params["pageSize"] = str(page_size)
    if search: params["search"] = search
    return await get_aging_customers(token, params or None)


@router.get("/aging/invoices", response_model=dict)
async def get_aging_invoices_endpoint(
    as_of_date: str | None = Query(None, alias="asOfDate"),
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    search: str | None = Query(None),
    aging_bucket: str | None = Query(None, alias="agingBucket"),
    validate: bool | None = Query(None),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    params: dict = {}
    if as_of_date: params["asOfDate"] = as_of_date
    if page: params["page"] = str(page)
    if page_size: params["pageSize"] = str(page_size)
    if search: params["search"] = search
    if aging_bucket: params["agingBucket"] = aging_bucket
    if validate is not None: params["validate"] = "true" if validate else "false"
    return await get_aging_invoices(token, params or None)


@router.get("/aging/reconciliation", response_model=dict)
async def get_aging_reconciliation_endpoint(
    as_of_date: str | None = Query(None, alias="asOfDate"),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_aging_reconciliation(token, {"asOfDate": as_of_date} if as_of_date else None)


@router.get("/aging/invoice/{invoice_id}", response_model=dict)
async def get_aging_invoice_endpoint(
    invoice_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_aging_invoice(token, invoice_id)


@router.get("/aging/export")
async def export_aging_report(
    view: str | None = Query(None),
    as_of_date: str | None = Query(None, alias="asOfDate"),
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    params: dict = {}
    if view: params["view"] = view
    if as_of_date: params["asOfDate"] = as_of_date
    csv_content = await get_aging_export(token, params or None)
    filename = f"AR_Aging_{view or 'summary'}_{(as_of_date or 'export')}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/dunning", response_model=dict)
async def list_dunning(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_dunning(token)


# ─── Bank Reconciliation ────────────────────────────────────

@router.post("/bank-reconciliation/import", response_model=dict, status_code=201)
async def import_bank_csv_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await import_bank_csv(token, body)


@router.post("/bank-reconciliation/import-file", response_model=dict, status_code=201)
async def import_bank_file_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await import_bank_file(token, body)


@router.get("/bank-reconciliation/transactions", response_model=dict)
async def list_bank_transactions(
    batch: str | None = None,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_bank_transactions(token, batch)


@router.post("/bank-reconciliation/match", response_model=dict)
async def match_bank_transaction_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await match_bank_transaction(token, body)


@router.post("/bank-reconciliation/reconcile-manual", response_model=dict)
async def reconcile_bank_transaction_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await reconcile_bank_transaction(token, body)


@router.post("/bank-reconciliation/unmatch", response_model=dict)
async def unmatch_bank_transaction_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await unmatch_bank_transaction(token, body.get("transaction_id", 0))


@router.get("/bank-reconciliation/reports", response_model=dict)
async def list_bank_reports(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_bank_reports(token)


@router.get("/bank-reconciliation/variance-report", response_model=dict)
async def list_bank_variance_report(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_bank_variance_report(token)


@router.get("/bank-reconciliation/audit-logs", response_model=dict)
async def list_bank_audit_logs(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_bank_audit_logs(token)


@router.get("/bank-reconciliation/config", response_model=dict)
async def get_bank_config_endpoint(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_bank_config(token)


@router.post("/bank-reconciliation/config", response_model=dict)
async def update_bank_config_endpoint(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_bank_config(token, body)


# ─── Month-End Close / Fiscal Periods ───────────────────────

@router.get("/periods", response_model=dict)
async def list_periods(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_periods(token)


@router.post("/periods/{period_id}/close", response_model=dict)
async def close_period_endpoint(
    period_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await close_period(token, period_id)


@router.post("/periods/{period_id}/reopen-request", response_model=dict)
async def reopen_period_endpoint(
    period_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await reopen_period_request(token, period_id, body.get("reason", "Reopening period"))


@router.get("/periods/status", response_model=dict)
async def get_periods_status_endpoint(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_periods_status(token)


# ─── COGS & Profitability ────────────────────────────────────

@router.get("/reports/cogs/summary", response_model=dict)
async def list_cogs_summary(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_summary(token)


@router.get("/reports/cogs/invoices", response_model=dict)
async def list_cogs_invoices(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_invoices(token)


@router.get("/reports/cogs/products", response_model=dict)
async def list_cogs_products(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_products(token)


@router.get("/reports/cogs/ledger", response_model=dict)
async def list_cogs_ledger(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_ledger(token)


@router.get("/reports/cogs/invoice/{invoice_id}", response_model=dict)
async def list_cogs_invoice_drilldown(
    invoice_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_invoice_drilldown(token, invoice_id)


@router.get("/reports/cogs/dlq", response_model=dict)
async def list_cogs_dlq(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_cogs_dlq(token)

