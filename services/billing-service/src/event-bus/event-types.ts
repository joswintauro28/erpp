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
}

export interface InvoiceUpdatedEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
}

export interface InvoicePaidEvent extends BaseEvent {
  invoiceId: number;
  invoiceNumber: string;
  paymentId: number;
  amount: number;
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
  | QuotationConvertedEvent;
