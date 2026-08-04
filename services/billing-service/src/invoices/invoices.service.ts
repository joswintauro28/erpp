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
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";
import { PostingEngineService } from "../accounting/posting-engine.service";

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly postingEngine: PostingEngineService,
  ) {}


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
      creditNotes: invoice.creditNotes?.map((cn: any) => ({
        ...cn,
        amount: this.toNumber(cn.amount),
        note_number: cn.creditNoteNumber ?? `CN-${String(cn.id).padStart(4, "0")}`,
        date: cn.issueDate ? cn.issueDate.toISOString().split("T")[0] : cn.createdAt.toISOString().split("T")[0],
      })) ?? [],
      debitNotes: invoice.debitNotes?.map((dn: any) => ({
        ...dn,
        amount: this.toNumber(dn.amount),
        note_number: dn.debitNoteNumber ?? `DN-${String(dn.id).padStart(4, "0")}`,
        date: dn.issueDate ? dn.issueDate.toISOString().split("T")[0] : dn.createdAt.toISOString().split("T")[0],
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
        creditNotes: {
          orderBy: { createdAt: "desc" },
        },
        debitNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    return this.flattenInvoice(invoice);
  }

  async creditCheck(
    organizationId: number,
    options: { clientId?: number; clientName?: string; amount?: number; creditLimit?: number },
  ): Promise<any> {
    const amount = Number(options.amount ?? 0);
    const creditLimit = Number(options.creditLimit ?? 100000);
    const where: any = {
      organizationId,
      type: "receivable",
      status: { in: ["sent", "overdue", "partially_paid"] },
    };
    if (options.clientId) where.clientId = Number(options.clientId);
    if (options.clientName) where.clientName = { contains: options.clientName, mode: "insensitive" };

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: { id: true, invoiceNumber: true, balanceDue: true },
    });
    const outstanding = invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
    const approved = outstanding + amount <= creditLimit;

    return {
      client_id: options.clientId,
      client_name: options.clientName,
      outstanding,
      credit_limit: creditLimit,
      requested_amount: amount,
      available_credit: Math.max(0, creditLimit - outstanding),
      approved,
    };
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

    const result = this.flattenInvoice(raw);

    this.eventBus.emit(Events.InvoiceCreated, {
      organizationId,
      invoiceId: raw.id,
      invoiceNumber: result.invoiceNumber ?? `INV-${raw.id}`,
      clientName: dto.clientName ?? "Unknown",
      total: result.total,
      timestamp: new Date(),
    });

    return result;
  }

  async update(
    id: number,
    organizationId: number,
    dto: UpdateInvoiceDto,
  ): Promise<any> {
    this.logger.log(`Updating invoice ${id} for org: ${organizationId}`);

    const existing = await this.prisma.invoice.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Invoice not found");

    if (existing.status !== "draft") {
      throw new BadRequestException(
        "Only draft invoices can be edited. Current status: " + existing.status,
      );
    }

    const gstTreatment = dto.gstTreatment ?? dto.gst_treatment ?? existing.gstTreatment;
    const clientId = dto.clientId ?? dto.client_id ?? existing.clientId;
    const clientName = dto.clientName ?? dto.client_name ?? existing.clientName;
    const vendorId = dto.vendorId ?? dto.vendor_id ?? existing.vendorId;
    const vendorName = dto.vendorName ?? dto.vendor_name ?? existing.vendorName;
    const invoiceNumber = dto.invoiceNumber ?? dto.invoice_number ?? existing.invoiceNumber;
    const placeOfSupply = dto.placeOfSupply ?? dto.place_of_supply ?? existing.placeOfSupply;
    const rawIssueDate = dto.issueDate ?? dto.issue_date;
    const rawDueDate = dto.dueDate ?? dto.due_date;
    const discountType = dto.discountType ?? dto.discount_type ?? existing.discountType;

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const itemsData = dto.items?.map((item) => {
      const qty = Number(item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
      const gstRate = Number(item.gstRate ?? item.gst_rate ?? item.gst_percent ?? 0);
      const amount = qty * unitPrice;
      subtotal += amount;

      if (gstTreatment === GstTreatment.interstate) {
        igst += (amount * gstRate) / 100;
      } else {
        const half = (amount * gstRate) / 200;
        cgst += half;
        sgst += half;
      }

      return {
        productId: item.productId ?? item.product_id,
        description: item.description ?? item.product ?? "",
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(unitPrice),
        costPrice: new Prisma.Decimal(item.costPrice ?? item.cost_price ?? 0),
        gstRate: new Prisma.Decimal(gstRate),
        amount: new Prisma.Decimal(amount),
      };
    });

    const discount = Number(dto.discount ?? existing.discount);
    const taxableValue = (itemsData ? subtotal : Number(existing.subtotal)) - discount;
    const taxTotal = itemsData ? (cgst + sgst + igst) : (Number(existing.cgst) + Number(existing.sgst) + Number(existing.igst));
    const total = taxableValue + taxTotal;

    return this.prisma.$transaction(async (tx) => {
      if (itemsData) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          type: dto.type,
          clientId,
          clientName,
          vendorId,
          vendorName,
          invoiceNumber,
          gstTreatment,
          placeOfSupply,
          issueDate: rawIssueDate ? new Date(rawIssueDate) : undefined,
          dueDate: rawDueDate ? new Date(rawDueDate) : undefined,
          notes: dto.notes,
          discount: dto.discount !== undefined ? new Prisma.Decimal(discount) : undefined,
          discountType,
          subtotal: itemsData ? new Prisma.Decimal(subtotal) : undefined,
          cgst: itemsData ? new Prisma.Decimal(cgst) : undefined,
          sgst: itemsData ? new Prisma.Decimal(sgst) : undefined,
          igst: itemsData ? new Prisma.Decimal(igst) : undefined,
          taxTotal: itemsData ? new Prisma.Decimal(taxTotal) : undefined,
          total: new Prisma.Decimal(total),
          balanceDue: new Prisma.Decimal(total),
          items: itemsData ? { create: itemsData } : undefined,
        },
        include: { items: true, payments: true },
      });

      const result = this.flattenInvoice(updated);

      this.eventBus.emit(Events.InvoiceUpdated, {
        organizationId,
        invoiceId: id,
        invoiceNumber: result.invoiceNumber ?? `INV-${id}`,
        timestamp: new Date(),
      });

      return result;
    });
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

      if (status === InvoiceStatus.void) {
        const journal = await tx.journal.findFirst({
          where: { organizationId, sourceType: "Invoice", sourceId: id, status: "POSTED" },
        });
        if (journal) {
          await this.postingEngine.reverseJournal(organizationId, journal.id, `Invoice transitioned to ${status}`, "system", tx);
        }
      }


      const result = this.flattenInvoice(updated);

      this.eventBus.emit(Events.InvoiceStatusChanged, {
        organizationId,
        invoiceId: id,
        invoiceNumber: result.invoiceNumber ?? `INV-${id}`,
        fromStatus: invoice.status,
        toStatus: status,
        timestamp: new Date(),
      });

      if (status === "paid") {
        this.eventBus.emit(Events.InvoicePaid, {
          organizationId,
          invoiceId: id,
          invoiceNumber: result.invoiceNumber ?? `INV-${id}`,
          clientName: result.clientName ?? "Unknown",
          paymentId: 0,
          amount: result.paidAmount,
          timestamp: new Date(),
        });
      }

      return result;
    });
  }

  private async writeSentLedgerEntries(
    tx: any,
    organizationId: number,
    invoice: any,
  ) {
    const config = await tx.orgAccountingConfig.findUnique({
      where: { organizationId },
    });
    const useDeferred = config?.recognitionPolicy && config.recognitionPolicy !== "IMMEDIATE";
    const revenueRole = useDeferred ? "ROLE_DEFERRED_REVENUE" : "ROLE_SALES_REVENUE";

    const lines = [];
    const total = Number(invoice.total);
    const subtotal = Number(invoice.subtotal);
    const discount = Number(invoice.discount);
    const taxTotal = Number(invoice.taxTotal);

    // Debit Accounts Receivable
    lines.push({
      role: "ROLE_ACCOUNTS_RECEIVABLE",
      debit: total,
      credit: 0,
    });

    // Credit Revenue/Deferred Revenue/Freight per item
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        const itemAmount = Number(item.amount);
        const isFreight = item.description?.toLowerCase().includes("freight") || item.description?.toLowerCase().includes("shipping");
        const role = isFreight ? "ROLE_FREIGHT_REVENUE" : revenueRole;

        lines.push({
          role,
          debit: 0,
          credit: itemAmount,
        });
      }
    } else {
      lines.push({
        role: revenueRole,
        debit: 0,
        credit: subtotal,
      });
    }

    // Discount
    if (discount > 0) {
      lines.push({
        role: "ROLE_DISCOUNT_ALLOWED",
        debit: discount,
        credit: 0,
      });
    }

    // Tax
    if (taxTotal > 0) {
      lines.push({
        role: "ROLE_TAX_PAYABLE",
        debit: 0,
        credit: taxTotal,
      });
    }

    await this.postingEngine.postJournal({
      organizationId,
      postingDate: invoice.issueDate || new Date(),
      templateType: "INVOICE",
      sourceType: "Invoice",
      sourceId: invoice.id,
      currency: "USD",
      createdBy: "system",
      lines,
    }, tx);
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
        type: "receivable",
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
        status: "cleared",
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
