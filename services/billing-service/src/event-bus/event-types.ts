export const Events = {
  InvoiceCreated: "invoice.created",
  InvoiceUpdated: "invoice.updated",
  InvoicePaid: "invoice.paid",
  InvoiceStatusChanged: "invoice.status_changed",
  PaymentRecorded: "payment.recorded",
  PaymentRefunded: "payment.refunded",
  CreditNoteIssued: "credit-note.issued",
  DebitNoteIssued: "debit-note.issued",
  ExpenseCreated: "expense.created",
  QuotationConverted: "quotation.converted",
  RevenueRecognized: "revenue.recognized",
  RevenueReversed: "revenue.reversed",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export interface BaseEvent {
  organizationId: number;
  timestamp: Date;
}

export interface InvoiceCreatedEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  total: number;
  salesOrderCode?: string;
}

export interface InvoiceUpdatedEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
}

export interface InvoicePaidEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  paymentId: number;
  amount: number;
  salesOrderCode?: string;
}

export interface InvoiceStatusChangedEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
  fromStatus: string;
  toStatus: string;
}

export interface PaymentRecordedEvent extends BaseEvent {
  paymentId: number;
  invoiceId: number;
  invoiceNumber: string;
  amount: number;
  method: string;
  salesOrderCode?: string;
}

export interface PaymentRefundedEvent extends BaseEvent {
  paymentId: number;
  invoiceId: number;
  amount: number;
}

export interface CreditNoteIssuedEvent extends BaseEvent {
  creditNoteId: number;
  invoiceId: number;
  amount: number;
}

export interface DebitNoteIssuedEvent extends BaseEvent {
  debitNoteId: number;
  invoiceId: number;
  amount: number;
}

export interface ExpenseCreatedEvent extends BaseEvent {
  expenseId: number;
  amount: number;
  category: string;
}

export interface QuotationConvertedEvent extends BaseEvent {
  quotationId: number;
  invoiceId: number;
  clientName: string;
  total: number;
}

export interface RevenueRecognizedEvent extends BaseEvent {
  contractId: number;
  contractNumber: string;
  performanceObligationId: number;
  scheduleItemId: number;
  amount: number;
  recognitionMethod: string;
}

export interface RevenueReversedEvent extends BaseEvent {
  contractId: number;
  scheduleItemId: number;
  amount: number;
  reason: string;
}

export type EventPayload =
  | InvoiceCreatedEvent
  | InvoiceUpdatedEvent
  | InvoicePaidEvent
  | InvoiceStatusChangedEvent
  | PaymentRecordedEvent
  | PaymentRefundedEvent
  | CreditNoteIssuedEvent
  | DebitNoteIssuedEvent
  | ExpenseCreatedEvent
  | QuotationConvertedEvent
  | RevenueRecognizedEvent
  | RevenueReversedEvent;
