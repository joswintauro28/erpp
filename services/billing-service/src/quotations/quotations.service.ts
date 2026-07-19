import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QuotationStatus } from "@prisma/client";
import { CreateQuotationDto } from "./dto/create-quotation.dto";

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  private flatten(q: any) {
    return {
      id: q.id,
      quote_number: q.quoteNumber,
      client_id: q.clientId,
      client_name: q.clientName,
      total: Number(q.total),
      status: q.status,
      issue_date: q.issueDate?.toISOString().split("T")[0] ?? "",
      valid_until: q.validUntil?.toISOString().split("T")[0] ?? "",
      notes: q.notes ?? "",
      converted_invoice_id: q.convertedInvoiceId ?? undefined,
      created_at: q.createdAt?.toISOString() ?? null,
      items: (q.items ?? []).map((i: any) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unitPrice),
        gst_rate: Number(i.gstRate),
        amount: Number(i.amount),
      })),
    };
  }

  async findAll(organizationId: number) {
    const quotations = await this.prisma.quotation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return quotations.map((q) => this.flatten(q));
  }

  async findOne(id: number, organizationId: number) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!quotation) throw new NotFoundException("Quotation not found");
    return this.flatten(quotation);
  }

  async create(organizationId: number, dto: CreateQuotationDto) {
    const total = dto.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const quotation = await this.prisma.quotation.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        clientName: dto.clientName,
        quoteNumber: dto.quotationNumber ?? `Q-${Date.now()}`,
        issueDate: dto.quotationDate ? new Date(dto.quotationDate) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
        total,
        items: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            gstRate: Number(item.gstRate),
            amount: Number(item.quantity) * Number(item.unitPrice),
          })),
        },
      },
      include: { items: true },
    });

    return this.flatten(quotation);
  }

  async update(id: number, organizationId: number, dto: Partial<CreateQuotationDto>) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    if (existing.status !== "draft") {
      throw new ConflictException("Only draft quotations can be edited");
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};
      if (dto.clientId) updateData.clientId = dto.clientId;
      if (dto.clientName) updateData.clientName = dto.clientName;
      if (dto.quotationNumber) updateData.quoteNumber = dto.quotationNumber;
      if (dto.quotationDate) updateData.issueDate = new Date(dto.quotationDate);
      if (dto.validUntil) updateData.validUntil = new Date(dto.validUntil);
      if (dto.notes !== undefined) updateData.notes = dto.notes;

      if (dto.items && dto.items.length > 0) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        const total = dto.items.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
          0,
        );
        const created = await tx.quotation.update({
          where: { id },
          data: {
            ...updateData,
            total,
            items: {
              create: dto.items.map((item) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                gstRate: Number(item.gstRate),
                amount: Number(item.quantity) * Number(item.unitPrice),
              })),
            },
          },
          include: { items: true },
        });
        return this.flatten(created);
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: updateData,
        include: { items: true },
      });
      return this.flatten(updated);
    });
  }

  async updateStatus(id: number, organizationId: number, status: QuotationStatus) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Quotation not found");

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: { items: true },
    });

    return this.flatten(updated);
  }

  async remove(id: number, organizationId: number) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    await this.prisma.quotation.delete({ where: { id } });
  }

  async convertToInvoice(id: number, organizationId: number) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findFirst({
        where: { id, organizationId },
      });
      if (!quotation) throw new NotFoundException("Quotation not found");

      const invoice = await tx.invoice.create({
        data: {
          organizationId,
          clientId: quotation.clientId,
          clientName: quotation.clientName,
          total: quotation.total,
          subtotal: quotation.total,
          balanceDue: quotation.total,
          notes: quotation.notes,
          invoiceNumber: `INV-${Date.now()}`,
          items: {
            create: [
              {
                description: `Quotation: ${quotation.quoteNumber}`,
                quantity: 1,
                unitPrice: quotation.total,
                gstRate: 0,
                amount: quotation.total,
              },
            ],
          },
        },
        include: { items: true },
      });

      await tx.quotation.update({
        where: { id },
        data: {
          status: "accepted",
          convertedInvoiceId: invoice.id,
        },
      });

      return invoice;
    });
  }
}
