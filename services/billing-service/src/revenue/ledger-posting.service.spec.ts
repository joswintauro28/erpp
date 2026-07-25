import { Test, TestingModule } from "@nestjs/testing";
import { LedgerPostingService } from "./ledger-posting.service";
import { PrismaService } from "../prisma/prisma.service";

describe("LedgerPostingService", () => {
  let service: LedgerPostingService;
  let prisma: any;

  const mockAccountMapping = (role: string, accountId: number) => ({
    id: 1,
    organizationId: 1,
    role,
    accountId,
    account: { id: accountId, code: role === "ROLE_DEFERRED_REVENUE" ? "2300" : "4000", name: role, balance: 0 },
  });

  beforeEach(async () => {
    prisma = {
      accountMapping: {
        findUnique: jest.fn(),
      },
      ledgerEntry: {
        create: jest.fn(),
      },
      account: {
        update: jest.fn(),
      },
      revenueScheduleItem: {
        findFirst: jest.fn(),
      },
      revenueAuditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerPostingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LedgerPostingService>(LedgerPostingService);
  });

  describe("postRevenueRecognition", () => {
    it("should create debit (Deferred Revenue) and credit (Revenue) ledger entries", async () => {
      prisma.accountMapping.findUnique
        .mockResolvedValueOnce(mockAccountMapping("ROLE_DEFERRED_REVENUE", 10))
        .mockResolvedValueOnce(mockAccountMapping("ROLE_SALES_REVENUE", 20));

      prisma.ledgerEntry.create
        .mockResolvedValueOnce({ id: 100 })
        .mockResolvedValueOnce({ id: 200 });

      const result = await service.postRevenueRecognition({
        organizationId: 1,
        scheduleItemId: 5,
        amount: 1000,
        recognitionDate: new Date("2026-01-31"),
        contractId: 1,
        contractNumber: "CTR-001",
        performanceObligationId: 1,
        pobName: "Software License",
        recognitionMethod: "STRAIGHT_LINE",
      });

      expect(result.debitEntryId).toBe(100);
      expect(result.creditEntryId).toBe(200);
      expect(result.deferredRevenueAccountId).toBe(10);
      expect(result.revenueAccountId).toBe(20);

      expect(prisma.ledgerEntry.create).toHaveBeenCalledTimes(2);
      expect(prisma.account.update).toHaveBeenCalledTimes(2);

      // Deferred Revenue credit (decrease liability)
      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 10, debit: expect.anything(), credit: 0 }) }),
      );

      // Revenue debit (increase income)
      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 20, debit: 0, credit: expect.anything() }) }),
      );
    });

    it("should throw if deferred revenue account mapping is missing", async () => {
      prisma.accountMapping.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAccountMapping("ROLE_SALES_REVENUE", 20));

      await expect(
        service.postRevenueRecognition({
          organizationId: 1,
          scheduleItemId: 5,
          amount: 1000,
          recognitionDate: new Date(),
          contractId: 1,
          contractNumber: "CTR-001",
          performanceObligationId: 1,
          pobName: "Test",
          recognitionMethod: "STRAIGHT_LINE",
        }),
      ).rejects.toThrow(/No Deferred Revenue account mapping/);
    });

    it("should throw if revenue account mapping is missing", async () => {
      prisma.accountMapping.findUnique
        .mockResolvedValueOnce(mockAccountMapping("ROLE_DEFERRED_REVENUE", 10))
        .mockResolvedValueOnce(null);

      await expect(
        service.postRevenueRecognition({
          organizationId: 1,
          scheduleItemId: 5,
          amount: 1000,
          recognitionDate: new Date(),
          contractId: 1,
          contractNumber: "CTR-001",
          performanceObligationId: 1,
          pobName: "Test",
          recognitionMethod: "STRAIGHT_LINE",
        }),
      ).rejects.toThrow(/No Sales Revenue account mapping/);
    });
  });

  describe("reverseRecognition", () => {
    it("should reverse a recognized item", async () => {
      prisma.revenueScheduleItem.findFirst.mockResolvedValue({
        id: 5,
        status: "Recognized",
        scheduleId: 1,
        schedule: {
          contract: { organizationId: 1 },
          obligation: { name: "Test" },
        },
      });

      prisma.accountMapping.findUnique
        .mockResolvedValueOnce(mockAccountMapping("ROLE_DEFERRED_REVENUE", 10))
        .mockResolvedValueOnce(mockAccountMapping("ROLE_SALES_REVENUE", 20));

      prisma.ledgerEntry.create
        .mockResolvedValueOnce({ id: 300 })
        .mockResolvedValueOnce({ id: 400 });

      prisma.revenueScheduleItem.update = jest.fn().mockResolvedValue({});
      prisma.revenueAuditLog.create = jest.fn().mockResolvedValue({});

      const result = await service.reverseRecognition(1, 5, 1000, "Customer refund", "admin@test.com");

      expect(result.debitEntryId).toBe(300);
      expect(result.creditEntryId).toBe(400);

      // Debit: Revenue account (reduce income)
      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 20, debit: expect.anything(), credit: 0 }) }),
      );
      // Credit: Deferred Revenue account (increase liability)
      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accountId: 10, debit: 0, credit: expect.anything() }) }),
      );

      expect(prisma.revenueScheduleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 }, data: { status: "Reversed" } }),
      );
    });

    it("should throw if item is not in Recognized status", async () => {
      prisma.revenueScheduleItem.findFirst.mockResolvedValue({
        id: 5,
        status: "Scheduled",
        schedule: { contract: { organizationId: 1 }, obligation: { name: "Test" } },
      });

      await expect(
        service.reverseRecognition(1, 5, 1000, "Test reversal", "admin"),
      ).rejects.toThrow("is not in Recognized status");
    });
  });
});
