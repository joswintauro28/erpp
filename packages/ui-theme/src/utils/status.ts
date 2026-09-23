/**
 * Canonical status → Badge variant mapping (DESIGN.md §7.2).
 * Single source of truth — every page must use `statusVariant(domain, status)`
 * instead of local status maps.
 */

export type StatusVariantKey =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "neutral"

/** Normalize any status spelling (case, snake_case, dashes, spaces). */
const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim()

const INVOICE: Record<string, StatusVariantKey> = {
  paid: "success",
  "partially paid": "warning",
  sent: "info",
  pending: "warning",
  draft: "info",
  overdue: "destructive",
  void: "neutral",
  cancelled: "neutral",
  declined: "destructive",
  discrepancy: "destructive",
  refunded: "neutral",
}

const QUOTATION: Record<string, StatusVariantKey> = {
  draft: "neutral",
  sent: "info",
  "under review": "warning",
  pending: "warning",
  accepted: "success",
  converted: "success",
  rejected: "destructive",
  expired: "neutral",
}

const SALES_ORDER: Record<string, StatusVariantKey> = {
  draft: "neutral",
  pending: "warning",
  confirmed: "info",
  "credit pending": "warning",
  hold: "warning",
  "stock hold": "warning",
  approved: "success",
  dispatched: "success",
  delivered: "success",
  invoiced: "info",
  paid: "success",
  cancelled: "destructive",
  rejected: "destructive",
}

const LEAD: Record<string, StatusVariantKey> = {
  new: "info",
  qualified: "success",
  "in progress": "info",
  mql: "warning",
  converted: "success",
  lost: "neutral",
}

const CUSTOMER: Record<string, StatusVariantKey> = {
  active: "success",
  prospect: "info",
  dormant: "neutral",
  churned: "destructive",
  "at risk": "warning",
  overdue: "destructive",
  inactive: "neutral",
}

const OPPORTUNITY: Record<string, StatusVariantKey> = {
  discovery: "info",
  proposal: "info",
  negotiation: "warning",
  won: "success",
  lost: "neutral",
}

const REQUIREMENT: Record<string, StatusVariantKey> = {
  draft: "neutral",
  submitted: "info",
  approved: "success",
  rejected: "destructive",
}

const DOCUMENT: Record<string, StatusVariantKey> = {
  draft: "neutral",
  "under review": "warning",
  approved: "success",
  signed: "success",
  expired: "neutral",
  rejected: "destructive",
}

const REPORT: Record<string, StatusVariantKey> = {
  generating: "info",
  processing: "info",
  pending: "info",
  ready: "success",
  success: "success",
  completed: "success",
  failed: "destructive",
  error: "destructive",
}

const CONTACT: Record<string, StatusVariantKey> = {
  primary: "default",
  decision: "info",
  influencer: "neutral",
  inactive: "destructive",
}

const AI_LOG: Record<string, StatusVariantKey> = {
  success: "success",
  ready: "success",
  completed: "success",
  generating: "info",
  processing: "info",
  pending: "info",
  failed: "destructive",
  error: "destructive",
}

const PURCHASE_ORDER: Record<string, StatusVariantKey> = {
  draft: "neutral",
  ordered: "info",
  received: "success",
  cancelled: "destructive",
}

const PAYMENT: Record<string, StatusVariantKey> = {
  completed: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "neutral",
}

const CREDIT_NOTE: Record<string, StatusVariantKey> = {
  issued: "success",
  applied: "success",
  draft: "warning",
  pending: "warning",
  cancelled: "destructive",
  void: "neutral",
}

const DEBIT_NOTE: Record<string, StatusVariantKey> = {
  issued: "success",
  applied: "success",
  draft: "warning",
  pending: "warning",
  cancelled: "destructive",
  void: "neutral",
}

const EXPENSE: Record<string, StatusVariantKey> = {
  paid: "success",
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  cancelled: "destructive",
}

const ACCOUNT: Record<string, StatusVariantKey> = {
  active: "success",
  inactive: "neutral",
  suspended: "destructive",
  closed: "neutral",
}

const RECURRING_INVOICE: Record<string, StatusVariantKey> = {
  active: "success",
  paused: "warning",
  cancelled: "destructive",
  completed: "neutral",
}

const STOCK: Record<string, StatusVariantKey> = {
  "in stock": "success",
  low: "warning",
  "out of stock": "destructive",
}

const MAPS: Record<string, Record<string, StatusVariantKey>> = {
  invoice: INVOICE,
  quotation: QUOTATION,
  sales_order: SALES_ORDER,
  lead: LEAD,
  customer: CUSTOMER,
  client: CUSTOMER,
  opportunity: OPPORTUNITY,
  requirement: REQUIREMENT,
  document: DOCUMENT,
  report: REPORT,
  contact: CONTACT,
  ai_log: AI_LOG,
  purchase_order: PURCHASE_ORDER,
  payment: PAYMENT,
  credit_note: CREDIT_NOTE,
  debit_note: DEBIT_NOTE,
  expense: EXPENSE,
  account: ACCOUNT,
  recurring: RECURRING_INVOICE,
  recurring_invoice: RECURRING_INVOICE,
  stock: STOCK,
}

/**
 * Resolve the semantic Badge variant for a domain status.
 * Unknown statuses fall back to `neutral`.
 */
export function statusVariant(domain: string, status: string | undefined | null): StatusVariantKey {
  const map = MAPS[domain] ?? {}
  return map[norm(status ?? "")] ?? "neutral"
}
