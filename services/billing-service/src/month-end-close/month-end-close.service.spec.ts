import { Test, TestingModule } from "@nestjs/testing";
import { MonthEndCloseService } from "./month-end-close.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";

describe("MonthEndCloseService", () => {
  let service: MonthEndCloseService;
  let prisma: any;

  const mockPrismaService: any = {
    fiscalPeriod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bankTransaction: {
      count: jest.fn(),
    },
    revenueScheduleItem: {
      count: jest.fn(),
    },
    cogsPosting: {
      count: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
    },
    ledgerEntry: {
      aggregate: jest.fn(),
    },
    closeAuditLog: {
      create: jest.fn(),
    },
    closeSignOff: {
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    reopenRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthEndCloseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MonthEndCloseService>(MonthEndCloseService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe("getChecklist", () => {
    it("should return failed status if there are unreconciled bank transactions", async () => {
      const mockPeriod = {
        id: 1,
        label: "Jan 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        isClosed: false,
      };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.bankTransaction.count.mockResolvedValue(2); // 2 unmatched
      prisma.revenueScheduleItem.count.mockResolvedValue(0);
      prisma.cogsPosting.count.mockResolvedValue(0);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { debit: 100, credit: 100 } });

      const result = await service.getChecklist(1, 1);
      expect(result.can_close).toBe(false);
      expect(result.checklist.bank_reconciliation.status).toBe("failed");
      expect(result.checklist.bank_reconciliation.count).toBe(2);
    });

    it("should return failed status if ledger entries are out of balance", async () => {
      const mockPeriod = {
        id: 1,
        label: "Jan 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        isClosed: false,
      };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.bankTransaction.count.mockResolvedValue(0);
      prisma.revenueScheduleItem.count.mockResolvedValue(0);
      prisma.cogsPosting.count.mockResolvedValue(0);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { debit: 150.5, credit: 150.0 } }); // out of balance

      const result = await service.getChecklist(1, 1);
      expect(result.can_close).toBe(false);
      expect(result.checklist.journal_balancing.status).toBe("failed");
      expect(result.checklist.journal_balancing.difference).toBeCloseTo(0.5);
    });

    it("should return can_close true if all validations pass", async () => {
      const mockPeriod = {
        id: 1,
        label: "Jan 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        isClosed: false,
      };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.bankTransaction.count.mockResolvedValue(0);
      prisma.revenueScheduleItem.count.mockResolvedValue(0);
      prisma.cogsPosting.count.mockResolvedValue(0);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { debit: 1000, credit: 1000 } });

      const result = await service.getChecklist(1, 1);
      expect(result.can_close).toBe(true);
      expect(result.checklist.bank_reconciliation.status).toBe("passed");
      expect(result.checklist.journal_balancing.status).toBe("passed");
    });
  });

  describe("closePeriod", () => {
    it("should throw error if period is not closed but validations fail", async () => {
      const mockPeriod = {
        id: 1,
        label: "Jan 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        isClosed: false,
      };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.bankTransaction.count.mockResolvedValue(5); // fails bank reconc

      await expect(service.closePeriod(1, 1, 99)).rejects.toThrow(BadRequestException);
      expect(prisma.closeAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "VALIDATION_FAILED",
            performedBy: 99,
          }),
        }),
      );
    });

    it("should successfully lock the period and record controller signoff if validations pass", async () => {
      const mockPeriod = {
        id: 1,
        label: "Jan 2026",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
        isClosed: false,
      };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.bankTransaction.count.mockResolvedValue(0);
      prisma.revenueScheduleItem.count.mockResolvedValue(0);
      prisma.cogsPosting.count.mockResolvedValue(0);
      prisma.invoice.count.mockResolvedValue(0);
      prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { debit: 500, credit: 500 } });

      const result = await service.closePeriod(1, 1, 99, "Looks good");
      expect(result.message).toContain("closed successfully");
      expect(prisma.fiscalPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ isClosed: true }),
        }),
      );
      expect(prisma.closeSignOff.create).toHaveBeenCalled();
      expect(prisma.closeAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CLOSE",
            performedBy: 99,
          }),
        }),
      );
    });
  });

  describe("reopening request approval workflow", () => {
    it("should submit a reopen request correctly", async () => {
      const mockPeriod = { id: 1, isClosed: true };
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      prisma.reopenRequest.create.mockResolvedValue({ id: 5 });

      const result = await service.submitReopenRequest(1, 1, 99, "Need to adjust Q1 postings");
      expect(result.message).toContain("submitted successfully");
      expect(prisma.reopenRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: "Need to adjust Q1 postings",
            requestedBy: 99,
          }),
        }),
      );
    });

    it("should approve a reopen request and unlock the period", async () => {
      const mockRequest = { id: 5, periodId: 1, status: "Pending" };
      const mockPeriod = { id: 1, label: "Jan 2026", isClosed: true };
      prisma.reopenRequest.findFirst.mockResolvedValue(mockRequest);
      prisma.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);

      const result = await service.approveReopenRequest(1, 5, 100, "Approved by CFO");
      expect(result.message).toContain("reopened successfully");
      expect(prisma.reopenRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: expect.objectContaining({ status: "Approved", approvedBy: 100 }),
        }),
      );
      expect(prisma.fiscalPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ isClosed: false }),
        }),
      );
    });
  });
});
