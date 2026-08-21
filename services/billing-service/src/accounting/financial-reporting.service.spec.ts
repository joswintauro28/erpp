import { Test, TestingModule } from "@nestjs/testing";
import { FinancialReportingService, ReportType, ReportStatus } from "./financial-reporting.service";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

describe("FinancialReportingService", () => {
  let service: FinancialReportingService;
  let prisma: any;

  const mockPrismaService = {
    fiscalPeriod: {
      findMany: jest.fn(),
    },
    ledgerEntry: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    cogsPosting: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    revenueScheduleItem: {
      findMany: jest.fn(),
    },
    financialReportTemplate: {
      findFirst: jest.fn(),
    },
    financialSnapshot: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    financialReport: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialReportingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FinancialReportingService>(FinancialReportingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should detect locked periods correctly", async () => {
    prisma.fiscalPeriod.findMany.mockResolvedValue([
      { id: 10, label: "Q2 Locked Period", startDate: new Date("2026-04-01"), endDate: new Date("2026-06-30"), isClosed: true },
    ]);

    const status = await service.checkPeriodLockStatus(1, new Date("2026-05-01"), new Date("2026-05-31"));
    expect(status.isLocked).toBe(true);
    expect(status.lockedPeriods.length).toBe(1);
    expect(status.lockedPeriods[0].label).toBe("Q2 Locked Period");
  });

  it("should aggregate standard invoices and recognized schedules in Profit & Loss", async () => {
    // Mock general ledger entries
    prisma.ledgerEntry.findMany.mockResolvedValue([
      {
        id: 1,
        accountId: 101,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(10000), // Credit 10,000 (Revenue)
        entryDate: new Date("2026-07-10"),
        referenceType: "Invoice",
        referenceId: 1,
        dimensions: { branchId: 10 },
        account: { id: 101, code: "4001", name: "Sales Revenue", type: "Revenue" },
      },
      {
        id: 2,
        accountId: 102,
        debit: new Prisma.Decimal(4500), // Debit 4,500 (COGS)
        credit: new Prisma.Decimal(0),
        entryDate: new Date("2026-07-15"),
        referenceType: "Shipment",
        referenceId: 2,
        dimensions: { branchId: 10 },
        account: { id: 102, code: "5000", name: "Cost of Goods Sold", type: "Expense" },
      },
      {
        id: 3,
        accountId: 103,
        debit: new Prisma.Decimal(1500), // Debit 1,500 (Opex)
        credit: new Prisma.Decimal(0),
        entryDate: new Date("2026-07-20"),
        referenceType: "Expense",
        referenceId: 3,
        dimensions: { branchId: 10 },
        account: { id: 103, code: "6001", name: "Rent Expense", type: "Expense" },
      },
    ]);

    // Mock drill-down dependencies
    prisma.invoice.findMany.mockResolvedValue([
      { id: 1, invoiceNumber: "INV-001", clientName: "Acme Corp", total: new Prisma.Decimal(10000), status: "sent" },
    ]);
    prisma.cogsPosting.findMany.mockResolvedValue([
      { id: 2, shipmentReference: "SHIP-002", totalCost: new Prisma.Decimal(4500), status: "Posted" },
    ]);
    prisma.expense.findMany.mockResolvedValue([
      { id: 3, reference: "EXP-003", amount: new Prisma.Decimal(1500), description: "Office Rent", status: "recorded" },
    ]);
    prisma.revenueScheduleItem.findMany.mockResolvedValue([]);
    prisma.fiscalPeriod.findMany.mockResolvedValue([]);

    const report = await service.getProfitAndLoss(1, {
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
      dimensions: { branchId: 10 },
    });

    expect(report.summary.revenue).toBe(10000);
    expect(report.summary.cogs).toBe(4500);
    expect(report.summary.grossProfit).toBe(5500);
    expect(report.summary.operatingExpenses).toBe(1500);
    expect(report.summary.operatingProfit).toBe(4000);
    expect(report.summary.netProfit).toBe(4000);
    
    // Check KPI formula calculations
    expect(report.kpis.grossMarginPercent).toBe(55);
    expect(report.kpis.netMarginPercent).toBe(40);

    // Verify source transaction drilldown mappings
    expect(report.drilldown[1].type).toBe("Invoice");
    expect(report.drilldown[1].docNumber).toBe("INV-001");
    expect(report.drilldown[2].type).toBe("CogsPosting");
    expect(report.drilldown[2].docNumber).toBe("SHIP-002");
  });

  it("should translate report currency correctly using current FX exchange rates", async () => {
    prisma.ledgerEntry.findMany.mockResolvedValue([
      {
        id: 1,
        accountId: 101,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(83500), // INR 83,500
        entryDate: new Date("2026-07-10"),
        account: { id: 101, code: "4001", name: "Sales Revenue", type: "Revenue" },
      },
    ]);
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.cogsPosting.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.revenueScheduleItem.findMany.mockResolvedValue([]);
    prisma.fiscalPeriod.findMany.mockResolvedValue([]);

    const report = await service.getProfitAndLoss(1, {
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
      reportingCurrency: "USD", // Translate to USD
    });

    // Exchange rate USD: 83.5 -> 83,500 / 83.5 = 1000 USD
    expect(report.summary.revenue).toBe(1000);
  });

  it("should handle snapshot creation and report versioning", async () => {
    prisma.ledgerEntry.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.cogsPosting.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.revenueScheduleItem.findMany.mockResolvedValue([]);
    prisma.fiscalPeriod.findMany.mockResolvedValue([]);

    prisma.financialSnapshot.createMany.mockResolvedValue({ count: 0 });
    const snapshotResult = await service.generateSnapshot(1, 2026, {
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
    });

    expect(snapshotResult.message).toBe("Snapshot generated successfully");
    expect(prisma.financialSnapshot.createMany).toHaveBeenCalled();

    prisma.financialReport.findFirst.mockResolvedValue({ version: 2 });
    prisma.financialReport.create.mockImplementation((args: any) => Promise.resolve({ id: 1, ...args.data }));

    const savedVersion = await service.saveReportVersion(
      1,
      "Official Close Report",
      ReportType.PROFIT_LOSS,
      {
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        status: ReportStatus.PUBLISHED,
      },
      99,
    );

    expect(savedVersion.version).toBe(3);
    expect(savedVersion.status).toBe(ReportStatus.PUBLISHED);
    expect(savedVersion.createdBy).toBe(99);
  });
});
