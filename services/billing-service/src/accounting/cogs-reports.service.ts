import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface CogsReportFilters {
  startDate?: string;
  endDate?: string;
  warehouseId?: number;
  productId?: number;
  category?: string;
  costingMethod?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class CogsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: number, filters: CogsReportFilters = {}) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "paid", "partially_paid", "overdue"] },
        issueDate: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      },
      include: { items: true },
    });

    let totalRevenue = 0;
    let totalCogs = 0;

    for (const inv of invoices) {
      totalRevenue += Number(inv.subtotal);
      for (const item of inv.items) {
        totalCogs += Number(item.quantity) * Number(item.costPrice);
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPct = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
    const cogsPct = totalRevenue > 0 ? Math.round((totalCogs / totalRevenue) * 10000) / 100 : 0;

    // Operating expenses
    const expensesAgg = await this.prisma.expense.aggregate({
      where: {
        organizationId,
        date: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      },
      _sum: { amount: true },
    });
    const operatingExpenses = Number(expensesAgg._sum.amount || 0);
    const operatingProfit = grossProfit - operatingExpenses;
    const operatingMarginPct = totalRevenue > 0 ? Math.round((operatingProfit / totalRevenue) * 10000) / 100 : 0;

    // Inventory Asset Balance for Turnover
    const invAccount = await this.prisma.account.findFirst({
      where: { organizationId, code: "1003" },
    });
    const invAssetBalance = Number(invAccount?.balance || 950000);
    const inventoryTurnover = invAssetBalance > 0 ? Math.round((totalCogs / invAssetBalance) * 100) / 100 : 0;

    const postingsCount = await this.prisma.cogsPosting.count({
      where: { organizationId, status: "Posted" },
    });

    return {
      total_revenue: Math.round(totalRevenue),
      total_cogs: Math.round(totalCogs),
      gross_profit: Math.round(grossProfit),
      gross_margin_pct: grossMarginPct,
      cogs_pct: cogsPct,
      operating_expenses: Math.round(operatingExpenses),
      operating_profit: Math.round(operatingProfit),
      operating_margin_pct: operatingMarginPct,
      inventory_asset_value: Math.round(invAssetBalance),
      inventory_turnover: inventoryTurnover,
      postings_count: postingsCount,
      currency: "INR",
    };
  }

  async getInvoiceCogsReport(organizationId: number, filters: CogsReportFilters = {}) {
    const take = filters.limit ?? 50;
    const skip = filters.offset ?? 0;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "paid", "partially_paid", "overdue"] },
        issueDate: {
          gte: filters.startDate ? new Date(filters.startDate) : undefined,
          lte: filters.endDate ? new Date(filters.endDate) : undefined,
        },
      },
      include: { items: true },
      orderBy: { issueDate: "desc" },
      take,
      skip,
    });

    const totalCount = await this.prisma.invoice.count({
      where: {
        organizationId,
        status: { in: ["sent", "paid", "partially_paid", "overdue"] },
      },
    });

    const rows = invoices.map((inv) => {
      const revenue = Number(inv.subtotal);
      let cogs = 0;
      let totalQty = 0;

      for (const item of inv.items) {
        cogs += Number(item.quantity) * Number(item.costPrice);
        totalQty += Number(item.quantity);
      }

      const grossProfit = revenue - cogs;
      const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

      return {
        invoice_id: inv.id,
        invoice_number: inv.invoiceNumber || `INV-${inv.id}`,
        client_name: inv.clientName || "N/A",
        issue_date: inv.issueDate ? inv.issueDate.toISOString().split("T")[0] : "",
        status: inv.status,
        item_count: inv.items.length,
        total_quantity: totalQty,
        revenue: Math.round(revenue),
        cogs: Math.round(cogs),
        gross_profit: Math.round(grossProfit),
        margin_pct: marginPct,
      };
    });

    return {
      invoices: rows,
      total_count: totalCount,
      page: Math.floor(skip / take) + 1,
      limit: take,
    };
  }

  async getProductCogsReport(organizationId: number, filters: CogsReportFilters = {}) {
    const items = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          organizationId,
          status: { in: ["sent", "paid", "partially_paid", "overdue"] },
        },
      },
      include: { invoice: { select: { invoiceNumber: true, issueDate: true } } },
    });

    const productMap: Record<string, any> = {};

    for (const item of items) {
      const key = item.productId ? `prod-${item.productId}` : item.description;
      if (!productMap[key]) {
        productMap[key] = {
          product_id: item.productId,
          product_name: item.description,
          total_qty_sold: 0,
          total_revenue: 0,
          total_cogs: 0,
          unit_prices: [],
          cost_prices: [],
        };
      }

      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const costPrice = Number(item.costPrice);

      productMap[key].total_qty_sold += qty;
      productMap[key].total_revenue += qty * unitPrice;
      productMap[key].total_cogs += qty * costPrice;
      productMap[key].unit_prices.push(unitPrice);
      productMap[key].cost_prices.push(costPrice);
    }

    const products = Object.values(productMap).map((p: any) => {
      const revenue = p.total_revenue;
      const cogs = p.total_cogs;
      const grossProfit = revenue - cogs;
      const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;
      const avgSellingPrice = p.total_qty_sold > 0 ? Math.round((revenue / p.total_qty_sold) * 100) / 100 : 0;
      const avgUnitCost = p.total_qty_sold > 0 ? Math.round((cogs / p.total_qty_sold) * 100) / 100 : 0;

      return {
        product_id: p.product_id,
        product_name: p.product_name,
        total_quantity_sold: p.total_qty_sold,
        avg_selling_price: avgSellingPrice,
        avg_unit_cost: avgUnitCost,
        total_revenue: Math.round(revenue),
        total_cogs: Math.round(cogs),
        gross_profit: Math.round(grossProfit),
        margin_pct: marginPct,
      };
    });

    return { products };
  }

  async getCogsLedger(organizationId: number) {
    const postings = await this.prisma.cogsPosting.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { auditLogs: true },
    });

    return {
      postings: postings.map((p) => ({
        id: p.id,
        idempotency_key: p.idempotencyKey,
        invoice_id: p.invoiceId,
        shipment_reference: p.shipmentReference || `SHIP-${p.id}`,
        status: p.status,
        total_cost: Number(p.totalCost),
        warehouse_id: p.warehouseId || 1,
        snapshot_hash: p.snapshotHash,
        signature: p.signature,
        created_at: p.createdAt.toISOString(),
        audit_trail_count: p.auditLogs.length,
      })),
    };
  }

  async getInvoiceCogsDrilldown(organizationId: number, invoiceId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { items: true },
    });

    if (!invoice) throw new NotFoundException("Invoice not found");

    const postings = await this.prisma.cogsPosting.findMany({
      where: { organizationId, invoiceId },
      include: { auditLogs: true },
    });

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { organizationId, referenceType: "Invoice", referenceId: invoiceId },
      include: { account: { select: { name: true, code: true } } },
    });

    let totalCogs = 0;
    const items = invoice.items.map((i) => {
      const lineCogs = Number(i.quantity) * Number(i.costPrice);
      totalCogs += lineCogs;
      return {
        id: i.id,
        product_id: i.productId,
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unitPrice),
        cost_price: Number(i.costPrice),
        snapshot: i.costSnapshot,
        line_revenue: Number(i.amount),
        line_cogs: lineCogs,
        line_margin: Number(i.amount) - lineCogs,
      };
    });

    const revenue = Number(invoice.subtotal);
    const grossProfit = revenue - totalCogs;
    const marginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0;

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber || `INV-${invoice.id}`,
      client_name: invoice.clientName,
      status: invoice.status,
      issue_date: invoice.issueDate?.toISOString().split("T")[0],
      total_revenue: revenue,
      total_cogs: totalCogs,
      gross_profit: grossProfit,
      margin_pct: marginPct,
      items,
      postings,
      ledger_entries: entries.map((e) => ({
        id: e.id,
        account_code: e.account.code,
        account_name: e.account.name,
        debit: Number(e.debit),
        credit: Number(e.credit),
        description: e.description,
        entry_date: e.entryDate.toISOString().split("T")[0],
      })),
    };
  }

  async getDlqRecords(organizationId: number) {
    const inbox = await this.prisma.inboxRecord.findMany({
      where: { organizationId, processingStatus: { in: ["FAILED", "RECEIVED"] } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });

    return {
      dlq_records: inbox.map((rec) => ({
        id: rec.id,
        idempotency_key: rec.idempotencyKey,
        event_type: rec.eventType,
        status: rec.processingStatus,
        retry_count: rec.retryCount,
        received_at: rec.receivedAt.toISOString(),
        payload: rec.payload,
      })),
    };
  }
}
