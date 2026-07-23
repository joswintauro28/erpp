import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateDebitNoteDto } from "./dto/create-debit-note.dto";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";

@Injectable()
export class DebitNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
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
      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          total: new Prisma.Decimal(totalD),
          balanceDue: new Prisma.Decimal(balanceDue),
        },
      });

      const accounts = await tx.account.findMany({
        where: { organizationId, code: { in: ["1002", "4001"] } },
        select: { code: true, id: true },
      });
      const arId = accounts.find((a: any) => a.code === "1002")?.id;
      const revenueId = accounts.find((a: any) => a.code === "4001")?.id;

      if (arId && revenueId) {
        const amount = Number(dto.amount);
        const entryDate = new Date();
        const desc = `Debit Note #${debitNote.debitNoteNumber ?? debitNote.id} for Invoice ${invoice.invoiceNumber ?? `#${dto.invoiceId}`} — ${dto.reason ?? "Debit applied"}`;
        await tx.ledgerEntry.createMany({
          data: [
            {
              organizationId,
              accountId: arId,
              entryDate,
              description: desc,
              debit: new Prisma.Decimal(amount),
              credit: 0,
              referenceType: "DebitNote",
              referenceId: debitNote.id,
            },
            {
              organizationId,
              accountId: revenueId,
              entryDate,
              description: desc,
              debit: 0,
              credit: new Prisma.Decimal(amount),
              referenceType: "DebitNote",
              referenceId: debitNote.id,
            },
          ],
        });
      }

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
          await tx.invoice.update({
            where: { id: note.invoiceId },
            data: {
              total: new Prisma.Decimal(totalR),
              balanceDue: new Prisma.Decimal(Math.max(0, balanceDueR)),
            },
          });
        }
      }

      await tx.debitNote.delete({ where: { id } });
    });
  }
}
