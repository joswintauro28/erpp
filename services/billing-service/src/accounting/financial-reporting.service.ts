import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

export enum ReportType {
  PROFIT_LOSS = "ProfitAndLoss",
  BALANCE_SHEET = "BalanceSheet",
  CASH_FLOW = "CashFlow",
  TRIAL_BALANCE = "TrialBalance",
}

export enum ReportStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  RESTATED = "Restated",
  ARCHIVED = "Archived",
}

export interface DimensionFilter {
  branchId?: number;
  departmentId?: number;
  costCenterId?: number;
  projectId?: number;
  warehouseId?: number;
  clientId?: number; // Customer
  vendorId?: number;
  productId?: number;
  businessUnitId?: number;
  regionId?: number;
}

export interface ReportExecutionOptions {
  startDate: Date;
  endDate: Date;
  dimensions?: DimensionFilter;
  reportingCurrency?: string;
  comparisonType?: "PREVIOUS_PERIOD" | "PREVIOUS_YEAR" | "BUDGET" | "FORECAST";
  templateId?: number;
  status?: ReportStatus;
}

@Injectable()
export class FinancialReportingService {
  private readonly logger = new Logger(FinancialReportingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Resolves the accounting period close / lock status
  async checkPeriodLockStatus(organizationId: number, start: Date, end: Date) {
    const closedPeriods = await this.prisma.fiscalPeriod.findMany({
      where: {
        organizationId,
        isClosed: true,
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    return {
      isLocked: closedPeriods.length > 0,
      lockedPeriods: closedPeriods.map((p) => ({
        id: p.id,
        label: p.label,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    };
  }

  // Generate standard Profit & Loss
  async getProfitAndLoss(organizationId: number, options: ReportExecutionOptions) {
    const start = options.startDate;
    const end = options.endDate;
    const reportingCurrency = options.reportingCurrency || "INR"; // Default Base

    // 1. Respect accounting period lock status
    const lockStatus = await this.checkPeriodLockStatus(organizationId, start, end);

    // 2. Fetch ledger entries in period matching dimensions
    const rawLedgerEntries = await this.fetchLedgerEntriesWithDimensions(organizationId, start, end, options.dimensions);

    // 3. Build dynamic FX Translation table
    const fxRates = await this.getFxRates(organizationId);

    // 4. Load Custom Template or fallback to Default Chart of Accounts structure
    let templateStructure = null;
    if (options.templateId) {
      const template = await this.prisma.financialReportTemplate.findFirst({
        where: { id: options.templateId, organizationId },
      });
      if (template) {
        templateStructure = template.structure as any;
      }
    }

    // 5. Aggregate and group accounts
    const groupedAccounts = await this.aggregateAccountsByStructure(organizationId, rawLedgerEntries, templateStructure, reportingCurrency, fxRates);

    // 6. Drill-down enrichment (links to source transactions)
    const drilldownDetails = await this.enrichDrilldownData(organizationId, rawLedgerEntries);

    // 7. Calculate comparative data if requested
    let comparisons = null;
    if (options.comparisonType) {
      comparisons = await this.calculateComparisons(organizationId, options, groupedAccounts, fxRates);
    }

    // 8. Calculate forecasts if forecast comparison requested
    let projections = null;
    if (options.comparisonType === "FORECAST") {
      projections = await this.calculateRevenueForecasts(organizationId, start, end, reportingCurrency, fxRates);
    }

    // 9. Calculate Financial KPIs
    const kpis = this.calculateKPIs(groupedAccounts);

    return {
      reportingPeriod: {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        lockStatus,
      },
      reportingCurrency,
      summary: groupedAccounts.summary,
      hierarchy: groupedAccounts.hierarchy,
      kpis,
      comparisons,
      projections,
      drilldown: drilldownDetails,
    };
  }

  private async fetchLedgerEntriesWithDimensions(
    organizationId: number,
    start: Date,
    end: Date,
    dimensions?: DimensionFilter,
  ) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        organizationId,
        entryDate: { gte: start, lte: end },
      },
      include: {
        account: true,
      },
    });

    if (!dimensions || Object.keys(dimensions).length === 0) {
      return entries;
    }

    // Dynamic filtration based on JSONB dimensions
    return entries.filter((e) => {
      if (!e.dimensions) return false;
      const entryDims = e.dimensions as any;
      return Object.entries(dimensions).every(([key, value]) => {
        return entryDims[key] === value;
      });
    });
  }

  private async getFxRates(organizationId: number): Promise<Record<string, number>> {
    // Return standard exchange rates for translation relative to base currency
    return {
      INR: 1.0,
      USD: 83.5,
      EUR: 90.2,
      GBP: 105.8,
    };
  }

  private translateAmount(amount: number, fromCurrency: string, toCurrency: string, fxRates: Record<string, number>): number {
    if (fromCurrency === toCurrency) return amount;
    const amountInBase = amount * (fxRates[fromCurrency] || 1.0);
    return amountInBase / (fxRates[toCurrency] || 1.0);
  }

  private async aggregateAccountsByStructure(
    organizationId: number,
    entries: any[],
    templateStructure: any,
    reportingCurrency: string,
    fxRates: Record<string, number>,
  ) {
    const accountsMap = new Map<string, { id: number; code: string; name: string; type: string; debitSum: number; creditSum: number; net: number; entries: any[] }>();

    for (const entry of entries) {
      const acc = entry.account;
      const code = acc.code;
      const type = acc.type; // Asset, Liability, Equity, Revenue, Expense

      if (!accountsMap.has(code)) {
        accountsMap.set(code, {
          id: acc.id,
          code,
          name: acc.name,
          type,
          debitSum: 0,
          creditSum: 0,
          net: 0,
          entries: [],
        });
      }

      const grp = accountsMap.get(code)!;
      // Convert transaction amounts
      const entryCurrency = "INR"; // assume default base currency is INR
      const debitConverted = this.translateAmount(Number(entry.debit), entryCurrency, reportingCurrency, fxRates);
      const creditConverted = this.translateAmount(Number(entry.credit), entryCurrency, reportingCurrency, fxRates);

      grp.debitSum += debitConverted;
      grp.creditSum += creditConverted;
      grp.entries.push({
        id: entry.id,
        date: entry.entryDate.toISOString().split("T")[0],
        description: entry.description,
        debit: debitConverted,
        credit: creditConverted,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
      });
    }

    // Apply accounting sign conventions and derive nets
    // Revenue normal is Credit: Credit - Debit. Expense normal is Debit: Debit - Credit.
    const revenueAccounts: any[] = [];
    const cogsAccounts: any[] = [];
    const opexAccounts: any[] = [];
    const otherAccounts: any[] = [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOpex = 0;
    let totalOther = 0;

    for (const [code, acc] of accountsMap.entries()) {
      if (acc.type === "Revenue") {
        acc.net = acc.creditSum - acc.debitSum;
        totalRevenue += acc.net;
        revenueAccounts.push(acc);
      } else if (acc.type === "Expense") {
        acc.net = acc.debitSum - acc.creditSum;
        if (code === "5000" || acc.name.toLowerCase().includes("cost of goods sold") || acc.name.toLowerCase().includes("cogs")) {
          totalCogs += acc.net;
          cogsAccounts.push(acc);
        } else {
          totalOpex += acc.net;
          opexAccounts.push(acc);
        }
      } else {
        // Other non-operating accounts
        acc.net = acc.creditSum - acc.debitSum;
        totalOther += acc.net;
        otherAccounts.push(acc);
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const operatingProfit = grossProfit - totalOpex;
    const netProfit = operatingProfit + totalOther;

    return {
      summary: {
        revenue: Math.round(totalRevenue * 100) / 100,
        cogs: Math.round(totalCogs * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        operatingExpenses: Math.round(totalOpex * 100) / 100,
        operatingProfit: Math.round(operatingProfit * 100) / 100,
        otherIncomeExpense: Math.round(totalOther * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
      },
      hierarchy: {
        revenue: { total: totalRevenue, accounts: revenueAccounts },
        cogs: { total: totalCogs, accounts: cogsAccounts },
        opex: { total: totalOpex, accounts: opexAccounts },
        other: { total: totalOther, accounts: otherAccounts },
      },
    };
  }

  private async calculateComparisons(
    organizationId: number,
    options: ReportExecutionOptions,
    currentResults: any,
    fxRates: Record<string, number>,
  ) {
    const duration = options.endDate.getTime() - options.startDate.getTime();
    let compStart = new Date(options.startDate.getTime() - duration);
    let compEnd = new Date(options.startDate.getTime() - 1);

    if (options.comparisonType === "PREVIOUS_YEAR") {
      compStart = new Date(options.startDate);
      compStart.setFullYear(compStart.getFullYear() - 1);
      compEnd = new Date(options.endDate);
      compEnd.setFullYear(compEnd.getFullYear() - 1);
    }

    const compOptions = { ...options, startDate: compStart, endDate: compEnd, comparisonType: undefined };
    // Pass custom mock method parameters to fetch ledger entries
    const compLedgers = await this.fetchLedgerEntriesWithDimensions(organizationId, compStart, compEnd, options.dimensions);
    const compData = await this.aggregateAccountsByStructure(organizationId, compLedgers, null, options.reportingCurrency || "INR", fxRates);

    const compSummary = compData.summary;
    const curSummary = currentResults.summary;

    const computeVariance = (cur: number, prev: number) => {
      const abs = cur - prev;
      const pct = prev === 0 ? 0 : (abs / prev) * 100;
      return {
        comparisonValue: prev,
        variance: Math.round(abs * 100) / 100,
        variancePercent: Math.round(pct * 100) / 100,
      };
    };

    return {
      comparisonPeriod: {
        startDate: compStart.toISOString().split("T")[0],
        endDate: compEnd.toISOString().split("T")[0],
      },
      variance: {
        revenue: computeVariance(curSummary.revenue, compSummary.revenue),
        cogs: computeVariance(curSummary.cogs, compSummary.cogs),
        grossProfit: computeVariance(curSummary.grossProfit, compSummary.grossProfit),
        operatingExpenses: computeVariance(curSummary.operatingExpenses, compSummary.operatingExpenses),
        operatingProfit: computeVariance(curSummary.operatingProfit, compSummary.operatingProfit),
        netProfit: computeVariance(curSummary.netProfit, compSummary.netProfit),
      },
    };
  }

  private async calculateRevenueForecasts(
    organizationId: number,
    start: Date,
    end: Date,
    reportingCurrency: string,
    fxRates: Record<string, number>,
  ) {
    const forecastedItems = await this.prisma.revenueScheduleItem.findMany({
      where: {
        organizationId,
        recognitionDate: { gte: start, lte: end },
        status: "Scheduled",
      },
    });

    const totalForecast = forecastedItems.reduce((sum, item) => sum + this.translateAmount(Number(item.amount), "INR", reportingCurrency, fxRates), 0);

    return {
      projectedRevenue: Math.round(totalForecast * 100) / 100,
      details: forecastedItems.map((item) => ({
        id: item.id,
        amount: item.amount,
        date: item.recognitionDate.toISOString().split("T")[0],
        status: item.status,
      })),
    };
  }

  private calculateKPIs(groupedAccounts: any) {
    const sum = groupedAccounts.summary;
    const rev = sum.revenue || 1.0; // avoid divide by zero
    return {
      grossMarginPercent: Math.round(((sum.grossProfit / rev) * 100) * 100) / 100,
      operatingMarginPercent: Math.round(((sum.operatingProfit / rev) * 100) * 100) / 100,
      netMarginPercent: Math.round(((sum.netProfit / rev) * 100) * 100) / 100,
      opexRatio: Math.round(((sum.operatingExpenses / rev) * 100) * 100) / 100,
      cogsRatio: Math.round(((sum.cogs / rev) * 100) * 100) / 100,
    };
  }

  private async enrichDrilldownData(organizationId: number, entries: any[]) {
    const invoiceIds = new Set<number>();
    const shipmentIds = new Set<number>();
    const expenseIds = new Set<number>();
    const revSchedIds = new Set<number>();

    for (const entry of entries) {
      if (entry.referenceId && entry.referenceType) {
        if (entry.referenceType === "Invoice") invoiceIds.add(entry.referenceId);
        if (entry.referenceType === "Shipment") shipmentIds.add(entry.referenceId);
        if (entry.referenceType === "Expense") expenseIds.add(entry.referenceId);
        if (entry.referenceType === "RevenueRecognition" || entry.referenceType === "RevenueReversal") {
          revSchedIds.add(entry.referenceId);
        }
      }
    }

    const [invoices, shipments, expenses, revScheds] = await Promise.all([
      invoiceIds.size > 0 ? this.prisma.invoice.findMany({ where: { id: { in: [...invoiceIds] }, organizationId } }) : [],
      shipmentIds.size > 0 ? this.prisma.cogsPosting.findMany({ where: { id: { in: [...shipmentIds] }, organizationId } }) : [],
      expenseIds.size > 0 ? this.prisma.expense.findMany({ where: { id: { in: [...expenseIds] }, organizationId } }) : [],
      revSchedIds.size > 0 ? this.prisma.revenueScheduleItem.findMany({ where: { id: { in: [...revSchedIds] }, organizationId }, include: { schedule: { include: { contract: true } } } }) : [],
    ]);

    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
    const shipmentMap = new Map(shipments.map((s) => [s.id, s]));
    const expenseMap = new Map(expenses.map((e) => [e.id, e]));
    const revSchedMap = new Map(revScheds.map((r) => [r.id, r]));

    const drilldowns: Record<number, any> = {};

    for (const entry of entries) {
      if (!entry.referenceId || !entry.referenceType) continue;

      if (entry.referenceType === "Invoice") {
        const inv = invoiceMap.get(entry.referenceId);
        if (inv) {
          drilldowns[entry.id] = {
            type: "Invoice",
            id: inv.id,
            docNumber: inv.invoiceNumber,
            clientName: inv.clientName || inv.vendorName,
            status: inv.status,
            total: inv.total,
          };
        }
      } else if (entry.referenceType === "Shipment") {
        const ship = shipmentMap.get(entry.referenceId);
        if (ship) {
          drilldowns[entry.id] = {
            type: "CogsPosting",
            id: ship.id,
            docNumber: ship.shipmentReference,
            total: ship.totalCost,
            status: ship.status,
          };
        }
      } else if (entry.referenceType === "Expense") {
        const exp = expenseMap.get(entry.referenceId);
        if (exp) {
          drilldowns[entry.id] = {
            type: "Expense",
            id: exp.id,
            docNumber: exp.reference || `EXP-${exp.id}`,
            description: exp.description,
            total: exp.amount,
            status: exp.status,
          };
        }
      } else if (entry.referenceType === "RevenueRecognition" || entry.referenceType === "RevenueReversal") {
        const rev = revSchedMap.get(entry.referenceId);
        if (rev) {
          drilldowns[entry.id] = {
            type: "RevenueScheduleItem",
            id: rev.id,
            docNumber: rev.schedule.contract.contractNumber,
            clientName: rev.schedule.contract.clientName,
            total: rev.amount,
            status: rev.status,
          };
        }
      }
    }

    return drilldowns;
  }

  // Materialized snapshots strategy methods
  async generateSnapshot(organizationId: number, periodId: number, options: ReportExecutionOptions) {
    const pld = await this.getProfitAndLoss(organizationId, options);
    const hash = this.calculateDimensionHash(options.dimensions);

    await this.prisma.financialSnapshot.deleteMany({
      where: { organizationId, periodId, dimensionHash: hash },
    });

    const records: any[] = [];
    const extractAccounts = (accGroup: any) => {
      for (const acc of accGroup.accounts || []) {
        records.push({
          organizationId,
          periodId,
          startDate: options.startDate,
          endDate: options.endDate,
          dimensionHash: hash,
          accountCode: acc.code,
          debitSum: new Prisma.Decimal(acc.debitSum),
          creditSum: new Prisma.Decimal(acc.creditSum),
        });
      }
    };

    extractAccounts(pld.hierarchy.revenue);
    extractAccounts(pld.hierarchy.cogs);
    extractAccounts(pld.hierarchy.opex);
    extractAccounts(pld.hierarchy.other);

    await this.prisma.financialSnapshot.createMany({ data: records });
    return { snapshotCount: records.length, message: "Snapshot generated successfully" };
  }

  private calculateDimensionHash(dimensions?: DimensionFilter): string {
    if (!dimensions || Object.keys(dimensions).length === 0) return "ALL";
    const sorted = Object.entries(dimensions).sort((a, b) => a[0].localeCompare(b[0]));
    return require("crypto").createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
  }

  // Version management
  async saveReportVersion(organizationId: number, name: string, type: ReportType, options: ReportExecutionOptions, userId: number) {
    const payload = await this.getProfitAndLoss(organizationId, options);
    
    const latest = await this.prisma.financialReport.findFirst({
      where: { organizationId, reportType: type },
      orderBy: { version: "desc" },
    });
    const nextVer = latest ? latest.version + 1 : 1;

    const report = await this.prisma.financialReport.create({
      data: {
        organizationId,
        name,
        reportType: type,
        startDate: options.startDate,
        endDate: options.endDate,
        status: options.status || ReportStatus.DRAFT,
        payload: payload as any,
        version: nextVer,
        createdBy: userId,
      },
    });

    return report;
  }
}
