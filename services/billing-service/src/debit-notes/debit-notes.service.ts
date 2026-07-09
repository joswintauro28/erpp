import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateDebitNoteDto } from "./dto/create-debit-note.dto";

@Injectable()
export class DebitNotesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAll(ownerId: number) {
    const notes = await this.prisma.debitNote.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: {
          select: { invoiceNumber: true, clientName: true },
        },
      },
    });
    return notes.map((n) => this.flatten(n));
  }

  async create(ownerId: number, dto: CreateDebitNoteDto, organizationId?: number) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, ownerId },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");

      const debitNote = await tx.debitNote.create({
        data: {
          ownerId,
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

      return this.flatten(debitNote);
    });
  }

  async remove(id: number, ownerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.debitNote.findFirst({
        where: { id, ownerId },
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
