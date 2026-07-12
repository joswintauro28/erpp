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

  private toNumber(value: any): number {
    return value != null ? Number(value) : 0;
  }

  private flattenItem(item: any) {
    return {
      ...item,
      quantity: this.toNumber(item.quantity),
      unitPrice: this.toNumber(item.unitPrice),
      gstRate: this.toNumber(item.gstRate),
      amount: this.toNumber(item.amount),
      cgst: this.toNumber(item.cgst),
      sgst: this.toNumber(item.sgst),
      igst: this.toNumber(item.igst),
    };
  }

  private flattenInvoice(invoice: any) {
    return {
      ...invoice,
      subtotal: this.toNumber(invoice.subtotal),
      cgst: this.toNumber(invoice.cgst),
      sgst: this.toNumber(invoice.sgst),
      igst: this.toNumber(invoice.igst),
      taxTotal: this.toNumber(invoice.taxTotal),
      total: this.toNumber(invoice.total),
      paidAmount: this.toNumber(invoice.paidAmount),
      balanceDue: this.toNumber(invoice.balanceDue),
      items: invoice.items?.map((i: any) => this.flattenItem(i)) ?? [],
      payments: invoice.payments?.map((p: any) => ({
        ...p,
        amount: this.toNumber(p.amount),
        refundedAmount: this.toNumber(p.refundedAmount),
      })) ?? [],
    };
  }

  async findAll(organizationId: number): Promise<any[]> {
    this.logger.log(`Fetching all invoices for org: ${organizationId}`);
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
      },
    });
    return invoices.map((inv) => this.flattenInvoice(inv));
  }

  async findOne(id: number, organizationId: number): Promise<any> {
    this.logger.log(`Fetching invoice ${id} for org: ${organizationId}`);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return this.flattenInvoice(invoice);
  }

  async create(organizationId: number, dto: CreateInvoiceDto): Promise<any> {
    this.logger.log(`Creating new invoice for client: ${dto.clientName} under org: ${organizationId}`);
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

    const raw = await this.prisma.invoice.create({
      data: {
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

    return this.flattenInvoice(raw);
  }

  async updateStatus(id: number, organizationId: number, status: InvoiceStatus): Promise<any> {
    this.logger.log(`Updating status of invoice ${id} to ${status} for org: ${organizationId}`);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    if (status === InvoiceStatus.cancelled && Number(invoice.paidAmount) > 0) {
      throw new ConflictException(
        "Cannot cancel an invoice with recorded payments. Issue a credit note instead.",
      );
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        payments: true,
      },
    });
    return this.flattenInvoice(updated);
  }

  async delete(id: number, organizationId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    await this.prisma.invoice.delete({ where: { id } });
  }

  async countByOwner(organizationId: number): Promise<number> {
    return this.prisma.invoice.count({ where: { organizationId } });
  }

  async sumRevenue(organizationId: number): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        status: { in: ["paid", "sent"] },
      },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  async sumOutstanding(organizationId: number): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        status: { in: ["sent", "overdue"] },
      },
      _sum: { balanceDue: true },
    });
    return Number(result._sum.balanceDue ?? 0);
  }

  async sumOverdue(organizationId: number): Promise<number> {
    const now = new Date();
    const result = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        status: "sent",
        dueDate: { lt: now },
      },
      _sum: { balanceDue: true },
    });
    return Number(result._sum.balanceDue ?? 0);
  }

  async getInvoiceSummary(organizationId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId },
      select: { status: true },
    });
    const total = invoices.length || 1;
    const counts: Record<string, number> = {};
    for (const inv of invoices) {
      const s = inv.status;
      counts[s] = (counts[s] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }));
  }

  async getRecentInvoices(organizationId: number, limit = 5) {
    const today = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId },
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

  async getRevenueTrend(organizationId: number) {
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        status: "completed",
        invoice: { organizationId },
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
