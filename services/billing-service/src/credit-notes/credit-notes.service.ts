import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";
import { PostingEngineService } from "../accounting/posting-engine.service";

@Injectable()
export class CreditNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly postingEngine: PostingEngineService,
  ) {}


  private flatten(note: any) {
    return {
      id: note.id,
      note_number: note.creditNoteNumber ?? `CN-${String(note.id).padStart(4, "0")}`,
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
    const notes = await this.prisma.creditNote.findMany({
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

  async create(organizationId: number, dto: CreateCreditNoteDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, organizationId },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");

      const creditNote = await tx.creditNote.create({
        data: {
          organizationId,
          invoiceId: dto.invoiceId,
          amount: new Prisma.Decimal(dto.amount),
          reason: dto.reason,
          creditNoteNumber: dto.creditNoteNumber ? String(dto.creditNoteNumber) : undefined,
          status: "issued",
          issueDate: new Date(),
        },
        include: {
          invoice: {
            select: { invoiceNumber: true, clientName: true },
          },
        },
      });

      const totalCredits = await tx.creditNote.aggregate({
        where: { invoiceId: dto.invoiceId },
        _sum: { amount: true },
      });

      const creditedAmount = Number(totalCredits._sum.amount ?? 0);
      const invoiceTotal = Number(invoice.total);
      const paid = Number(invoice.paidAmount);

      const newBalanceDue = Math.max(0, invoiceTotal - paid - creditedAmount);
      let newStatus = invoice.status;

      if (creditedAmount >= invoiceTotal) {
        newStatus = "void";
      } else if (newBalanceDue === 0) {
        newStatus = "paid";
      } else if (paid > 0 || creditedAmount > 0) {
        newStatus = "partially_paid";
      }

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          balanceDue: new Prisma.Decimal(newBalanceDue),
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
        templateType: "CREDIT_NOTE",
        sourceType: "CreditNote",
        sourceId: creditNote.id,
        currency: "USD",
        createdBy: "system",
        lines: [
          {
            role: revenueRole,
            debit: revenuePortion,
            credit: 0,
          },
          {
            role: "ROLE_TAX_PAYABLE",
            debit: taxPortion,
            credit: 0,
          },
          {
            role: "ROLE_ACCOUNTS_RECEIVABLE",
            debit: 0,
            credit: amountVal,
          },
        ],
      }, tx);


      this.eventBus.emit(Events.CreditNoteIssued, {
        organizationId,
        creditNoteId: creditNote.id,
        invoiceId: dto.invoiceId,
        amount: Number(dto.amount),
        timestamp: new Date(),
      });

      return this.flatten(creditNote);
    });
  }

  async remove(id: number, organizationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.creditNote.findFirst({
        where: { id, organizationId },
      });
      if (!note) throw new NotFoundException("Credit note not found");

      if (note.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: note.invoiceId },
        });
        if (invoice) {
          const invoiceTotal = Number(invoice.total);
          const paid = Number(invoice.paidAmount);
          
          // Recompute total credits excluding this deleted note
          const otherCredits = await tx.creditNote.aggregate({
            where: {
              invoiceId: note.invoiceId,
              id: { not: id },
            },
            _sum: { amount: true },
          });
          const otherCreditedAmount = Number(otherCredits._sum.amount ?? 0);

          // Update balanceDue
          const newBalanceDue = Math.max(0, invoiceTotal - paid - otherCreditedAmount);
          
          // Restore status if it was void
          let newStatus = invoice.status;
          if (invoice.status === "void") {
            if (paid >= invoiceTotal - otherCreditedAmount) {
              newStatus = "paid";
            } else if (paid > 0 || otherCreditedAmount > 0) {
              newStatus = "partially_paid";
            } else {
              newStatus = invoice.issueDate ? "sent" : "draft";
            }
          } else if (newBalanceDue > 0 && invoice.status === "paid") {
            newStatus = paid > 0 || otherCreditedAmount > 0 ? "partially_paid" : (invoice.issueDate ? "sent" : "draft");
          }

          await tx.invoice.update({
            where: { id: note.invoiceId },
            data: {
              balanceDue: new Prisma.Decimal(newBalanceDue),
              status: newStatus,
            },
          });
        }
      }

      await tx.creditNote.delete({ where: { id } });
    });
  }
}
