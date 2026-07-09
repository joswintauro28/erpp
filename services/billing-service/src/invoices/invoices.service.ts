import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, InvoiceStatus, GstTreatment } from "@prisma/client";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(ownerId: number): Promise<any[]> {
    this.logger.log(`Fetching all invoices for owner: ${ownerId}`);
    const invoices = await this.prisma.invoice.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });
    return invoices;
  }

  async findOne(id: number, ownerId: number): Promise<any> {
    this.logger.log(`Fetching invoice ${id} for owner: ${ownerId}`);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, ownerId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return invoice;
  }

  async create(ownerId: number, dto: CreateInvoiceDto, organizationId?: number): Promise<any> {
    this.logger.log(`Creating new invoice for client: ${dto.clientName} under owner: ${ownerId}`);
    const gstTreatment = dto.gstTreatment ?? GstTreatment.intrastate;

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const itemsData = dto.items.map((item) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const gstRate = Number(item.gstRate);
      const amount = qty * unitPrice;
      subtotal += amount;

      if (gstTreatment === GstTreatment.interstate) {
        igst += amount * gstRate / 100;
      } else {
        const half = amount * gstRate / 200;
        cgst += half;
        sgst += half;
      }

      return {
        productId: item.productId,
        description: item.description,
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(unitPrice),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const taxTotal = cgst + sgst + igst;
    const total = subtotal + taxTotal;

    const invoice = await this.prisma.invoice.create({
      data: {
        ownerId,
        organizationId,
        clientId: dto.clientId,
        clientName: dto.clientName,
        invoiceNumber: dto.invoiceNumber,
        gstTreatment,
        placeOfSupply: dto.placeOfSupply,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        subtotal: new Prisma.Decimal(subtotal),
        cgst: new Prisma.Decimal(cgst),
        sgst: new Prisma.Decimal(sgst),
        igst: new Prisma.Decimal(igst),
        taxTotal: new Prisma.Decimal(taxTotal),
        total: new Prisma.Decimal(total),
        balanceDue: new Prisma.Decimal(total),
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return invoice;
  }

  async updateStatus(id: number, ownerId: number, status: InvoiceStatus): Promise<any> {
    this.logger.log(`Updating status of invoice ${id} to ${status} for owner: ${ownerId}`);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, ownerId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    if (status === InvoiceStatus.cancelled && Number(invoice.paidAmount) > 0) {
      throw new ConflictException(
        "Cannot cancel an invoice with recorded payments. Issue a credit note instead.",
      );
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        payments: true,
      },
    });
  }

  async delete(id: number, ownerId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, ownerId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    await this.prisma.invoice.delete({ where: { id } });
  }

  async countByOwner(ownerId: number): Promise<number> {
    return this.prisma.invoice.count({ where: { ownerId } });
  }

  async sumRevenue(ownerId: number): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        ownerId,
        status: { in: ["paid", "sent"] },
      },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  async sumOutstanding(ownerId: number): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        ownerId,
        status: { in: ["sent", "overdue"] },
      },
      _sum: { balanceDue: true },
    });
    return Number(result._sum.balanceDue ?? 0);
  }

  async sumOverdue(ownerId: number): Promise<number> {
    const now = new Date();
    const result = await this.prisma.invoice.aggregate({
      where: {
        ownerId,
        status: "sent",
        dueDate: { lt: now },
      },
      _sum: { balanceDue: true },
    });
    return Number(result._sum.balanceDue ?? 0);
  }

  async getInvoiceSummary(ownerId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { ownerId },
      select: { status: true },
    });
    const total = invoices.length || 1;
    const counts: Record<string, { count: number; percentage: number }> = {};
    for (const inv of invoices) {
      const s = inv.status;
      if (!counts[s]) counts[s] = { count: 0, percentage: 0 };
      counts[s].count++;
    }
    for (const key of Object.keys(counts)) {
      counts[key].percentage = Math.round((counts[key].count / total) * 1000) / 10;
    }
    return counts;
  }

  async getRecentInvoices(ownerId: number, limit = 5) {
    const today = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        total: true,
        status: true,
        dueDate: true,
        paidAmount: true,
        createdAt: true,
      },
    });

    return invoices.map((inv) => {
      let displayStatus = inv.status;
      if (inv.status === "sent" && inv.dueDate && inv.dueDate < today) {
        displayStatus = "overdue";
      } else if (inv.status === "sent" && Number(inv.paidAmount) > 0) {
        if (Number(inv.paidAmount) >= Number(inv.total)) {
          displayStatus = "paid";
        } else {
          displayStatus = "partially_paid";
        }
      }
      return {
        ...inv,
        status: displayStatus,
        total: Number(inv.total),
        paidAmount: Number(inv.paidAmount),
      };
    });
  }

  async getRevenueTrend(ownerId: number) {
    const payments = await this.prisma.payment.findMany({
      where: {
        ownerId,
        status: "completed",
        invoice: { ownerId },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
    });

    const monthly: Record<string, number> = {};
    for (const p of payments) {
      if (!p.paymentDate) continue;
      const key = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] ?? 0) + Number(p.amount);
    }

    return Object.entries(monthly)
      .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}
