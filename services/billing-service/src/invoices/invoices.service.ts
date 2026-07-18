import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
      costPrice: this.toNumber(item.costPrice),
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
      discount: this.toNumber(invoice.discount),
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

  async findAll(
    organizationId: number,
    type?: string,
    status?: string,
  ): Promise<any[]> {
    this.logger.log(`Fetching invoices for org: ${organizationId}`);
    const where: any = { organizationId };
    if (type) where.type = type;
    if (status) {
      const statuses = status.split(",");
      where.status = { in: statuses };
    }
    const invoices = await this.prisma.invoice.findMany({
      where,
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
        costPrice: new Prisma.Decimal(item.costPrice ?? 0),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const discount = Number(dto.discount ?? 0);
    const taxableValue = subtotal - discount;
    const taxTotal = cgst + sgst + igst;
    const total = taxableValue + taxTotal;

    const raw = await this.prisma.invoice.create({
      data: {
        organizationId,
        type: dto.type ?? "receivable",
        clientId: dto.clientId,
        clientName: dto.clientName,
        vendorId: dto.vendorId,
        vendorName: dto.vendorName,
        invoiceNumber: dto.invoiceNumber,
        gstTreatment,
        placeOfSupply: dto.placeOfSupply,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(discount),
        discountType: dto.discountType ?? null,
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

  async createFromDispatch(organizationId: number, dto: any): Promise<any> {
    this.logger.log(`Creating invoice from dispatch for client: ${dto.clientName}`);

    const gstTreatment = "intrastate" as const;
    let subtotal = 0;
    let cgst = 0, sgst = 0, igst = 0;

    const itemsData = dto.items.map((item: any) => {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const gstRate = Number(item.gstRate);
      const amount = qty * unitPrice;
      subtotal += amount;

      if (gstTreatment === "intrastate") {
        cgst += amount * (gstRate / 2 / 100);
        sgst += amount * (gstRate / 2 / 100);
      } else {
        igst += amount * (gstRate / 100);
      }

      return {
        productId: item.productId,
        description: item.description,
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(unitPrice),
        costPrice: new Prisma.Decimal(item.costPrice ?? 0),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const taxTotal = cgst + sgst + igst;
    const total = subtotal + taxTotal;
    const now = new Date();

    const raw = await this.prisma.invoice.create({
      data: {
        organizationId,
        clientId: dto.clientId,
        clientName: dto.clientName,
        status: "sent",
        issueDate: now,
        dueDate: new Date(now.getTime() + 30 * 86400000),
        subtotal: new Prisma.Decimal(subtotal),
        cgst: new Prisma.Decimal(cgst),
        sgst: new Prisma.Decimal(sgst),
        igst: new Prisma.Decimal(igst),
        taxTotal: new Prisma.Decimal(taxTotal),
        total: new Prisma.Decimal(total),
        balanceDue: new Prisma.Decimal(total),
        gstTreatment,
        notes: dto.notes ?? (dto.dispatchReference ? `Auto-generated from dispatch: ${dto.dispatchReference}` : "Auto-generated from dispatch"),
        items: { create: itemsData },
      },
      include: { items: true, payments: true },
    });

    await this.writeSentLedgerEntries(this.prisma, organizationId, raw);

    this.logger.log(`Invoice #${raw.id} created from dispatch`);
    return this.flattenInvoice(raw);
  }

  private readonly validTransitions: Record<string, string[]> = {
    draft: ["sent", "void"],
    sent: ["partially_paid", "paid", "overdue", "void"],
    partially_paid: ["paid", "overdue", "void"],
    overdue: ["paid", "partially_paid", "void"],
    paid: [],
    void: [],
  };

  private assertValidTransition(current: string, next: string) {
    const allowed = this.validTransitions[current];
    if (!allowed || !allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition invoice from "${current}" to "${next}". Allowed transitions: ${(allowed ?? []).join(", ") || "none"}`,
      );
    }
  }

  async updateStatus(id: number, organizationId: number, status: InvoiceStatus): Promise<any> {
    this.logger.log(`Updating status of invoice ${id} to ${status} for org: ${organizationId}`);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");

    this.assertValidTransition(invoice.status, status);

    if (status === InvoiceStatus.void && Number(invoice.paidAmount) > 0) {
      throw new ConflictException(
        "Cannot void an invoice with recorded payments. Issue a credit note instead.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id },
        data: { status },
        include: {
          items: true,
          payments: true,
        },
      });

      if (status === "sent") {
        await this.writeSentLedgerEntries(tx, organizationId, updated);
      }

      return this.flattenInvoice(updated);
    });
  }

  private async writeSentLedgerEntries(
    tx: any,
    organizationId: number,
    invoice: any,
  ) {
    const accounts = await tx.account.findMany({
      where: { organizationId, code: { in: ["1002", "4001"] } },
      select: { code: true, id: true },
    });
    const arId = accounts.find((a: any) => a.code === "1002")?.id;
    const revenueId = accounts.find((a: any) => a.code === "4001")?.id;

    if (!arId || !revenueId) {
      this.logger.warn(
        `Cannot write ledger entries for invoice #${invoice.id}: missing AR (1002) or Revenue (4001) account`,
      );
      return;
    }

    const total = Number(invoice.total);
    const entryDate = invoice.issueDate ?? new Date();
    const desc = `Invoice ${invoice.invoiceNumber ?? `#${invoice.id}`} — Revenue recognized`;

    await tx.ledgerEntry.createMany({
      data: [
        {
          organizationId,
          accountId: arId,
          entryDate,
          description: desc,
          debit: new Prisma.Decimal(total),
          credit: 0,
          referenceType: "Invoice",
          referenceId: invoice.id,
        },
        {
          organizationId,
          accountId: revenueId,
          entryDate,
          description: desc,
          debit: 0,
          credit: new Prisma.Decimal(total),
          referenceType: "Invoice",
          referenceId: invoice.id,
        },
      ],
    });
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

  async sumByType(organizationId: number, type: string): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        organizationId,
        type: type as any,
        status: { not: "void" },
      },
      _sum: { balanceDue: true },
    });
    return Number(result._sum?.balanceDue ?? 0);
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
