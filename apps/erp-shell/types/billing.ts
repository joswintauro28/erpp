export interface Invoice {
  id: number;
  invoice_number: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: string;
  due_date: string;
}

export interface Payment {
  id: number;
  invoice_number: string;
  invoice_id: number;
  amount: number;
  payment_method: string;
}

export interface BillingInvoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  status: "paid" | "pending" | "partially_paid" | "overdue" | "void";
  issue_date: string;
  due_date: string;
  notes: string;
  gst_treatment: "intrastate" | "interstate";
  place_of_supply: string;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  items: InvoiceItem[];
}

export interface InvoiceItem {
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

export interface Quotation {
  id: number;
  quote_number: string;
  client_id: number;
  client_name: string;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  issue_date: string;
  valid_until: string;
  notes: string;
  converted_invoice_id?: number;
}

export interface RecurringInvoice {
  id: number;
  invoice_number: string;
  client_id: number;
  client_name: string;
  frequency: "weekly" | "monthly" | "quarterly" | "yearly";
  next_run: string;
  last_generated: string;
  auto_email: boolean;
  status: "active" | "paused";
}

export interface CreditNote {
  id: number;
  note_number: string;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  date: string;
  amount: number;
  status: "issued" | "draft";
}

export interface DebitNote {
  id: number;
  note_number: string;
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  date: string;
  amount: number;
  status: "issued" | "draft";
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

export interface ApiItem {
  id: number; product_id: number | null; description: string;
  quantity: number; unit_price: number; gst_rate: number; amount: number;
}

export interface ApiPayment {
  id: number; amount: number; payment_method: string | null;
  payment_date: string | null; reference_id: string | null; status: string;
}

export interface ApiInvoice {
  id: number; invoice_number: string | null; client_id: number;
  total: number; paid_amount: number; balance_due: number;
  status: string; issue_date: string | null; due_date: string | null;
  gst_treatment: string; place_of_supply: string | null;
  subtotal: number; cgst: number; sgst: number; igst: number;
  tax_total: number; notes: string | null;
  discount: number; discount_type: string | null;
  items: ApiItem[]; payments: ApiPayment[];
}

export interface InvoiceListView {
  id: number; invoice_number: string; client_id: number; client_name: string;
  total: number; paid_amount: number; balance_due: number;
  status: string; issue_date: string; due_date: string;
  gst_treatment: string; place_of_supply: string;
  subtotal: number; cgst: number; sgst: number; igst: number;
  tax_total: number; notes: string; taxable_value: number;
}

export interface InvoiceDetailView {
  id: number; invoice_number: string; client_id: number; client_name: string;
  total: number; paid_amount: number; balance_due: number;
  status: string; issue_date: string; due_date: string;
  gst_treatment: string; place_of_supply: string;
  cgst: number; sgst: number; igst: number;
  taxable_value: number; notes: string;
  discount: number; discount_type: string | null;
  items: InvoiceItemView[]; payments: ApiPayment[];
}

export interface InvoiceItemView {
  product: string; description: string; quantity: number;
  unit_price: number; gst_percent: number;
  cgst: number; sgst: number; igst: number; total: number;
}

export interface ApiClientRef {
  id: number; name: string;
}
