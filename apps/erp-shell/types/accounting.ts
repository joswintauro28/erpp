export interface Account {
  id: number;
  code: string;
  name: string;
  type: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  group: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
}

export interface LedgerEntry {
  id: number;
  date: string;
  account_id: number;
  account_name: string;
  description: string;
  voucher_type: string;
  voucher_number: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: "paid" | "pending" | "void";
  paid_to: string;
  payment_method: string;
  bill_number: string;
  notes: string;
}

export interface FinancialReport {
  month: string;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
}

export interface BalanceSheetItem {
  category: string;
  items: { label: string; amount: number }[];
}

// ─── Fiscal Periods ───

export interface FiscalPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  closed_by: string | null;
  closed_at: string | null;
}

// ─── Bank Reconciliation ───

export interface BankTransaction {
  id: number;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  match_status: string;
  ledger_entry_id: number | null;
}

export interface ReconciliationAuditLog {
  id: number;
  bank_transaction_id: number;
  action: string;
  performed_by: string;
  details: string;
  created_at: string;
}

// ─── Dunning ───

export interface DunningRecord {
  id: number;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  amount_due: number;
  dunning_level: number;
  last_sent: string;
  next_action: string;
  status: string;
}

// ─── AR Aging ───

export interface AgingBucket {
  label: string;
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_120_plus: number;
  total: number;
}

// ─── Dashboard ───

export interface AccountingDashboard {
  total_revenue: number;
  outstanding_receivables: number;
  overdue_amount: number;
  net_profit: number;
  cash_balance: number;
  recent_entries: LedgerEntry[];
  monthly_trend: FinancialReport[];
}
