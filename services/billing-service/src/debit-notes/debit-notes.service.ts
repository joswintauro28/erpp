import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateDebitNoteDto } from "./dto/create-debit-note.dto";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";
import { PostingEngineService } from "../accounting/posting-engine.service";

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly postingEngine: PostingEngineService,
  ) {}


  private flatten(note: any) {
    return {
      id: note.id,
      note_number: note.debitNoteNumber ?? `DN-${String(note.id).padStart(4, "0")}`,
      invoice_id: note.invoiceId,
      invoice_number: note.invoice?.invoiceNumber ?? `INV-${note.invoiceId}`,
      client_name: note.invoice?.clientName ?? "Unknown",
      date: note.issueDate?.toISOString().split("T")[0] ?? note.createdAt.toISOString().split("T")[0],
      amount: Number(note.amount),
      status: note.status,
      reason: note.reason,
    };
  }

  async findAll(organizationId: number) {
    const notes = await this.prisma.debitNote.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: { invoiceNumber: true, clientName: true },
        },
      },
    });
    return notes.map((n) => this.flatten(n));
  }

  async create(organizationId: number, dto: CreateDebitNoteDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");

      const debitNote = await tx.debitNote.create({
        data: {
          organizationId,
          invoiceId: dto.invoiceId,
          amount: new Prisma.Decimal(dto.amount),
          reason: dto.reason,
          debitNoteNumber: dto.debitNoteNumber ? String(dto.debitNoteNumber) : undefined,
          status: "issued",
          issueDate: new Date(),
        },
        include: {
          invoice: {
            select: { invoiceNumber: true, clientName: true },
          },
        },
      });

      const totalD = Number(invoice.total) + Number(dto.amount);
      const balanceDue = Number(invoice.balanceDue) + Number(dto.amount);

      let newStatus = invoice.status;
      if (balanceDue === 0) {
        newStatus = "paid";
      } else if (invoice.status === "paid") {
        newStatus = "partially_paid";
      } else if (invoice.status === "void") {
        newStatus = Number(invoice.paidAmount) > 0 ? "partially_paid" : (invoice.issueDate ? "sent" : "draft");
      }

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          total: new Prisma.Decimal(totalD),
          balanceDue: new Prisma.Decimal(balanceDue),
          status: newStatus,
        },
      });

      const config = await tx.orgAccountingConfig.findUnique({
        where: { organizationId },
      });
      const useDeferred = config?.recognitionPolicy && config.recognitionPolicy !== "IMMEDIATE";
      const revenueRole = useDeferred ? "ROLE_DEFERRED_REVENUE" : "ROLE_SALES_REVENUE";

      const totalVal = Number(invoice.total);
      const taxVal = Number(invoice.taxTotal);
      const amountVal = Number(dto.amount);

      // Compute proportional tax vs revenue component for proper reversing splits
      const taxPortion = totalVal > 0 ? (amountVal * taxVal) / totalVal : 0;
      const revenuePortion = amountVal - taxPortion;

      await this.postingEngine.postJournal({
        organizationId,
        postingDate: new Date(),
        templateType: "DEBIT_NOTE",
        sourceType: "DebitNote",
        sourceId: debitNote.id,
        currency: "USD",
        createdBy: "system",
        lines: [
          {
            role: "ROLE_ACCOUNTS_RECEIVABLE",
            debit: amountVal,
            credit: 0,
          },
          {
            role: revenueRole,
            debit: 0,
            credit: revenuePortion,
          },
          {
            role: "ROLE_TAX_PAYABLE",
            debit: 0,
            credit: taxPortion,
          },
        ],
      }, tx);


      this.eventBus.emit(Events.DebitNoteIssued, {
        organizationId,
        debitNoteId: debitNote.id,
        invoiceId: dto.invoiceId,
        amount: Number(dto.amount),
        timestamp: new Date(),
      });

      return this.flatten(debitNote);
    });
  }

  async remove(id: number, organizationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.debitNote.findFirst({
        where: { id, organizationId },
      });
      if (!note) throw new NotFoundException("Debit note not found");

      if (note.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: note.invoiceId },
        });
        if (invoice) {
          const totalR = Number(invoice.total) - Number(note.amount);
          const balanceDueR = Number(invoice.balanceDue) - Number(note.amount);

          let newStatus = invoice.status;
          if (balanceDueR <= 0) {
            newStatus = "paid";
          } else if (invoice.status === "paid") {
            newStatus = "partially_paid";
          }

          await tx.invoice.update({
            where: { id: note.invoiceId },
            data: {
              total: new Prisma.Decimal(totalR),
              balanceDue: new Prisma.Decimal(Math.max(0, balanceDueR)),
              status: newStatus,
            },
          });
        }
      }

      await tx.debitNote.delete({ where: { id } });
    });
  }
}
