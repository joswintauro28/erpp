import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRecurringInvoiceDto } from "./dto/create-recurring-invoice.dto";

@Injectable()
export class RecurringInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private flatten(r: any) {
    return {
      id: r.id,
      invoice_number: r.templateName,
      client_id: r.clientId,
      client_name: r.clientName,
      frequency: r.frequency,
      total: Number(r.total),
      next_run: r.nextRun?.toISOString().split("T")[0] ?? "",
      last_generated: r.lastGenerated?.toISOString().split("T")[0] ?? "",
      end_date: r.endDate?.toISOString().split("T")[0] ?? "",
      auto_email: r.autoEmail,
      status: r.status,
    };
  }

  async findAll(organizationId: number) {
    const items = await this.prisma.recurringInvoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return items.map((r) => this.flatten(r));
  }

  async findOne(id: number, organizationId: number) {
    const item = await this.prisma.recurringInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!item) throw new NotFoundException("Recurring invoice not found");
    return this.flatten(item);
  }

  async create(organizationId: number, dto: CreateRecurringInvoiceDto) {
    const total = dto.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const item = await this.prisma.recurringInvoice.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        clientName: dto.clientName,
        templateName: dto.invoiceNumber ?? `RECUR-${Date.now()}`,
        frequency: dto.interval as any,
        nextRun: dto.nextInvoiceDate ? new Date(dto.nextInvoiceDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        total,
        autoEmail: false,
        items: dto.items as any,
      },
    });

    return this.flatten(item);
  }

  async update(id: number, organizationId: number, dto: Partial<CreateRecurringInvoiceDto> & { status?: "active" | "paused" | "completed" }) {
    const item = await this.prisma.recurringInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!item) throw new NotFoundException("Recurring invoice not found");

    const data: any = {};

    if (dto.status) data.status = dto.status;
    if (dto.invoiceNumber) data.templateName = dto.invoiceNumber;
    if (dto.interval) data.frequency = dto.interval;
    if (dto.nextInvoiceDate) data.nextRun = new Date(dto.nextInvoiceDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.items) {
      data.items = dto.items as any;
      data.total = dto.items.reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.unitPrice),
        0,
      );
    }

    const updated = await this.prisma.recurringInvoice.update({
      where: { id },
      data,
    });

    return this.flatten(updated);
  }

  async remove(id: number, organizationId: number) {
    const item = await this.prisma.recurringInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!item) throw new NotFoundException("Recurring invoice not found");
    await this.prisma.recurringInvoice.delete({ where: { id } });
  }
}
