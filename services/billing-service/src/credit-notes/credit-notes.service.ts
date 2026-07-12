import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";

@Injectable()
export class CreditNotesService {
  constructor(private readonly prisma: PrismaService) {}

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

      if (creditedAmount >= invoiceTotal) {
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: { status: "cancelled" },
        });
      } else {
        const paid = Number(invoice.paidAmount);
        const balanceDue = invoiceTotal - paid - creditedAmount;
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: {
            balanceDue: new Prisma.Decimal(Math.max(0, balanceDue)),
          },
        });
      }

      return this.flatten(creditNote);
    });
  }

  async remove(id: number, organizationId: number) {
    const note = await this.prisma.creditNote.findFirst({
      where: { id, organizationId },
    });
    if (!note) throw new NotFoundException("Credit note not found");
    await this.prisma.creditNote.delete({ where: { id } });
  }
}
