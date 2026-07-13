export interface InvoiceListView {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  issue_date: string;
  due_date: string;
  gst_treatment: string;
  place_of_supply: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax_total: number;
  notes: string;
  taxable_value: number;
}

export interface InvoiceDetailView {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  issue_date: string;
  due_date: string;
  gst_treatment: string;
  place_of_supply: string;
  cgst: number;
  sgst: number;
  igst: number;
  taxable_value: number;
  notes: string;
  items: InvoiceItemView[];
  payments: ApiPayment[];
}

export interface InvoiceItemView {
  product: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface ApiPayment {
  id: number;
  amount: number;
  payment_method: string | null;
  payment_date: string | null;
  reference_id: string | null;
  status: string;
}

export interface ApiInvoice {
  id: number;
  invoice_number: string | null;
  client_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  gst_treatment: string;
  place_of_supply: string | null;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax_total: number;
  notes: string | null;
  items: ApiItem[];
  payments: ApiPayment[];
}

export interface ApiItem {
  id: number;
  product: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  total: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface ApiClientRef {
  id: number;
  name: string;
}

export interface Quotation {
  id: number;
  quote_number: string;
  client_id: number;
  client_name: string;
  total: number;
  status: string;
  issue_date: string;
  valid_until: string;
  notes: string;
  converted_invoice_id?: number;
}

export interface CreditNote {
  id: number;
  note_number: string;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  date: string;
  amount: number;
  status: string;
}

export interface DebitNote {
  id: number;
  note_number: string;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  date: string;
  amount: number;
  status: string;
}

export interface BillingPayment {
  id: number;
  payment_id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  refunded_amount: number;
  method: string;
  reference: string;
  date: string;
}

export interface RecurringInvoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  frequency: string;
  next_run: string;
  last_generated: string;
  auto_email: boolean;
  status: string;
}

export interface DashboardPaymentMetrics {
  today: number;
  this_month: number;
  outstanding: number;
  refunds: number;
  failed: number;
}

export interface DashboardSummaryItem {
  status: string;
  count: number;
  percentage: number;
}

export interface DashboardRecentInvoice {
  id: number;
  invoice_number: string;
  client_name: string;
  total: number;
  status: string;
  due_date: string | null;
  paid_amount: number;
  created_at: string;
}

export interface DashboardRevenueTrend {
  month: string;
  revenue: number;
}

export interface BillingDashboardData {
  total_revenue: number;
  outstanding: number;
  overdue: number;
  payment_metrics: DashboardPaymentMetrics;
  summary: DashboardSummaryItem[];
  recent_invoices: DashboardRecentInvoice[];
  revenue_trend: DashboardRevenueTrend[];
}

export interface AccountEntry {
  id: number;
  code: string;
  name: string;
  type: string;
  sub_type: string | null;
  description: string | null;
  balance: number;
  is_active: boolean;
}

export interface ExpenseEntry {
  id: number;
  account_code: string;
  account_name: string;
  amount: number;
  category: string | null;
  description: string | null;
  date: string;
  payment_method: string | null;
  reference: string | null;
  status: string;
}

export interface LedgerEntryView {
  id: number;
  account_code: string;
  account_name: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  reference_type: string | null;
  reference_id: number | null;
}

export interface ProfitLoss {
  revenue: number;
  expenses: number;
  net_income: number;
}

export interface BalanceSheet {
  assets: number;
  liabilities: number;
  equity: number;
}

export interface FinancialReport {
  profit_loss: ProfitLoss;
  balance_sheet: BalanceSheet;
}
