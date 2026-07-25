import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Events,
  EventName,
  EventPayload,
  InvoiceCreatedEvent,
  InvoicePaidEvent,
  PaymentRecordedEvent,
  CreditNoteIssuedEvent,
  DebitNoteIssuedEvent,
  ExpenseCreatedEvent,
} from "./event-types";

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: EventName, payload: EventPayload): void {
    this.logger.debug(`Event: ${event}`, { id: (payload as any).id ?? (payload as any).invoiceId });
    this.emitter.emit(event, payload);
    this.forwardToServices(event, payload).catch((err) =>
      this.logger.error(`Event forward failed for ${event}: ${err.message}`),
    );
  }

  on(event: EventName, handler: (payload: any) => void | Promise<void>): void {
    this.emitter.on(event, handler);
  }

  private async forwardToServices(event: EventName, payload: EventPayload): Promise<void> {
    const orgId = payload.organizationId;
    const base = (payload as any).total ?? (payload as any).amount ?? 0;
    const body = { event, organization_id: orgId, payload, timestamp: payload.timestamp };

    const targets = this.getForwardTargets(event, payload);
    await Promise.allSettled(
      targets.map((url) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Event-Forward": "billing-service" },
          body: JSON.stringify(body),
        }).catch((err) => this.logger.warn(`Forward to ${url} failed: ${err.message}`)),
      ),
    );
  }

  private getForwardTargets(event: EventName, _payload: EventPayload): string[] {
    switch (event) {
      case Events.InvoiceCreated:
        return ["http://localhost:8000/api/events/billing/invoice-created"];
      case Events.InvoicePaid:
        return ["http://localhost:8001/api/events/billing/invoice-paid"];
      case Events.PaymentRecorded:
        return ["http://localhost:8000/api/events/billing/payment-recorded"];
      case Events.CreditNoteIssued:
      case Events.DebitNoteIssued:
        return ["http://localhost:8000/api/events/billing/note-issued"];
      case Events.ExpenseCreated:
        return ["http://localhost:8000/api/events/billing/expense-created"];
      default:
        return [];
    }
  }
}
