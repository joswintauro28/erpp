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
