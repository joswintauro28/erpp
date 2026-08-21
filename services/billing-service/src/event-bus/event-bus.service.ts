import { Inject, Injectable, Logger } from "@nestjs/common";
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

  constructor(
    private readonly emitter: EventEmitter2,
    @Inject("AMQP_CHANNEL") private readonly channel: any,
  ) {}

  emit(event: EventName, payload: EventPayload): void {
    this.logger.debug(`Event: ${event}`, { id: (payload as any).id ?? (payload as any).invoiceId });
    this.emitter.emit(event, payload);
    this.publishToRmq(event, payload).catch((err) =>
      this.logger.error(`Event RabbitMQ publish failed for ${event}: ${err.message}`),
    );
  }

  on(event: EventName, handler: (payload: any) => void | Promise<void>): void {
    this.emitter.on(event, handler);
  }

  private async publishToRmq(event: EventName, payload: EventPayload): Promise<void> {
    const routingKey = this.getRoutingKey(event, payload);
    if (!routingKey) {
      this.logger.debug(`No routing key mapped for event: ${event}`);
      return;
    }

    const body = {
      event,
      organization_id: payload.organizationId,
      payload,
      timestamp: payload.timestamp,
    };

    const messageBuffer = Buffer.from(JSON.stringify(body));
    this.channel.publish("erp_events", routingKey, messageBuffer, { persistent: true });
    this.logger.log(`Published event ${event} to erp_events exchange with routing key ${routingKey}`);
  }

  private getRoutingKey(event: EventName, payload: EventPayload): string | null {
    switch (event) {
      case Events.InvoiceCreated:
        return "billing.invoice.created";
      case Events.InvoicePaid:
        return "billing.invoice.paid";
      case Events.PaymentRecorded:
        return "billing.payment.recorded";
      case Events.CreditNoteIssued:
        return "billing.credit_note.issued";
      case Events.DebitNoteIssued:
        return "billing.debit_note.issued";
      case Events.ExpenseCreated:
        return "billing.expense.created";
      case Events.InvoiceStatusChanged:
        const statusPayload = payload as any;
        if (statusPayload.toStatus === "sent") {
          return "billing.invoice.sent";
        }
        if (statusPayload.toStatus === "overdue") {
          return "billing.invoice.overdue";
        }
        return null;
      default:
        return null;
    }
  }
}
