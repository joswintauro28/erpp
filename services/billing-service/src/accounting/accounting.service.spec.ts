import { Test, TestingModule } from "@nestjs/testing";
import { AccountingService } from "./accounting.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventBusService } from "../event-bus/event-bus.service";
import { CashFlowReportingMode } from "./dto/cash-flow-query.dto";

import { PostingEngineService } from "./posting-engine.service";

describe("AccountingService - Cash Flow Statement", () => {
  let service: AccountingService;
  let prisma: any;

  const mockPrismaService = {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    ledgerEntry: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    bankTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    expense: {
      create: jest.fn(),
    },
    outboxRecord: {
      create: jest.fn(),
    },
  };

  const mockEventBusService = {
    emit: jest.fn(),
  };

  const mockPostingEngineService = {
    postJournal: jest.fn(),
    reverseJournal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventBusService, useValue: mockEventBusService },
        { provide: PostingEngineService, useValue: mockPostingEngineService },
      ],
    }).compile();


    service = module.get<AccountingService>(AccountingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it("should return empty statement if no cash accounts found", async () => {
    prisma.account.findMany.mockResolvedValue([]);

    const result = await service.getCashFlowStatement(1, {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      reportingMode: CashFlowReportingMode.DIRECT,
    });

    expect(result.openingBalance).toBe(0);
    expect(result.closingCashBalance).toBe(0);
    expect(result.transactions).toHaveLength(0);
  });

  it("should compute cash flow correctly for Operating, Investing and Financing activities", async () => {
    // Mock Accounts
    prisma.account.findMany.mockResolvedValue([
      { id: 1, code: "1001", name: "Cash & Bank", type: "Asset", subType: "Current Assets", balance: 50000 },
      { id: 2, code: "1002", name: "Accounts Receivable", type: "Asset", subType: "Current Assets", balance: 10000 },
      { id: 3, code: "1101", name: "Office Equipment", type: "Asset", subType: "Fixed Assets", balance: 20000 },
      { id: 4, code: "2101", name: "Bank Loan — Term", type: "Liability", subType: "Long Term Debt", balance: 30000 },
    ]);

    // Mock ledger entries for cash accounts after start
    prisma.ledgerEntry.findMany.mockImplementation(async (args: any) => {
      const inIds = args.where?.accountId?.in || [];
      
      if (inIds.includes(1)) {
        // Cash Account IDs
        return [
          { id: 10, accountId: 1, debit: 10000, credit: 0, entryDate: new Date("2026-06-01"), description: "Invoice payment", referenceType: "Payment", referenceId: 1, account: { id: 1, code: "1001", type: "Asset", name: "Cash & Bank" } },
          { id: 11, accountId: 1, debit: 0, credit: 5000, entryDate: new Date("2026-07-01"), description: "Buy desk", referenceType: "Expense", referenceId: 2, account: { id: 1, code: "1001", type: "Asset", name: "Cash & Bank" } },
        ];
      }
      
      if (inIds.includes(2)) {
        // AR Account IDs
        return [
          { id: 20, accountId: 2, debit: 0, credit: 10000, entryDate: new Date("2026-06-01"), description: "Invoice payment", referenceType: "Payment", referenceId: 1, account: { id: 2, code: "1002", type: "Asset", name: "Accounts Receivable" } },
          { id: 40, accountId: 2, debit: 15000, credit: 0, entryDate: new Date("2026-08-01"), description: "Revenue accrue", referenceType: "Invoice", referenceId: 5, account: { id: 2, code: "1002", type: "Asset", name: "Accounts Receivable" } },
        ];
      }

      // Otherwise, return all period ledger entries
      return [
        // Cash Inflow: Operating (AR)
        { id: 10, accountId: 1, debit: 10000, credit: 0, entryDate: new Date("2026-06-01"), description: "Invoice payment", referenceType: "Payment", referenceId: 1, account: { id: 1, code: "1001", type: "Asset", name: "Cash & Bank" } },
        { id: 20, accountId: 2, debit: 0, credit: 10000, entryDate: new Date("2026-06-01"), description: "Invoice payment", referenceType: "Payment", referenceId: 1, account: { id: 2, code: "1002", type: "Asset", name: "Accounts Receivable" } },

        // Cash Outflow: Investing (Fixed Assets)
        { id: 11, accountId: 1, debit: 0, credit: 5000, entryDate: new Date("2026-07-01"), description: "Buy desk", referenceType: "Expense", referenceId: 2, account: { id: 1, code: "1001", type: "Asset", name: "Cash & Bank" } },
        { id: 30, accountId: 3, debit: 5000, credit: 0, entryDate: new Date("2026-07-01"), description: "Buy desk", referenceType: "Expense", referenceId: 2, account: { id: 3, code: "1101", type: "Asset", name: "Office Equipment", subType: "Fixed Assets" } },

        // Non-cash transaction (Should be excluded)
        { id: 40, accountId: 2, debit: 15000, credit: 0, entryDate: new Date("2026-08-01"), description: "Revenue accrue", referenceType: "Invoice", referenceId: 5, account: { id: 2, code: "1002", type: "Asset", name: "Accounts Receivable" } },
        { id: 50, accountId: 99, debit: 0, credit: 15000, entryDate: new Date("2026-08-01"), description: "Revenue accrue", referenceType: "Invoice", referenceId: 5, account: { id: 99, code: "4001", type: "Revenue", name: "Software Licenses" } },
      ];
    });

    prisma.bankTransaction.findMany.mockResolvedValue([]);
    prisma.bankTransaction.findFirst.mockResolvedValue({ balance: 45000 });

    const result = await service.getCashFlowStatement(1, {
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      reportingMode: CashFlowReportingMode.DIRECT,
    });

    // Current Cash: 50000. Ledger entries after start: debits 10000, credits 5000.
    // Opening balance = 50000 - 10000 + 5000 = 45000
    expect(result.openingBalance).toBe(45000);
    expect(result.operatingActivities.netCash).toBe(10000);
    expect(result.investingActivities.netCash).toBe(-5000);
    expect(result.financingActivities.netCash).toBe(0);
    expect(result.closingCashBalance).toBe(50000);

    // Check transactions list (Non-cash transaction with id: 40, 50 should be excluded!)
    expect(result.transactions.some(t => t.id === 40)).toBe(false);
    expect(result.transactions.some(t => t.id === 10)).toBe(true);
    expect(result.transactions.some(t => t.id === 11)).toBe(true);
  });
});
