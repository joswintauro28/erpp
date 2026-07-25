import { Test, TestingModule } from "@nestjs/testing";
import { PostingEngineService } from "./posting-engine.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("PostingEngineService", () => {
  let service: PostingEngineService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    fiscalPeriod: {

      findFirst: jest.fn(),
    },
    accountMapping: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    orgPostingConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(() => Promise.resolve({ numberingPrefix: "JV-", suspenseAccountStrategy: "REJECT_POSTING" })),
    },

    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journal: {
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    journalLine: {
      create: jest.fn(),
    },
    ledgerEntry: {
      create: jest.fn(),
    },
    outboxRecord: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostingEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PostingEngineService>(PostingEngineService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateFiscalPeriod", () => {
    it("should throw BadRequestException if period does not exist", async () => {
      mockPrismaService.fiscalPeriod.findFirst.mockResolvedValue(null);
      await expect(service.validateFiscalPeriod(1, new Date())).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if period is closed", async () => {
      mockPrismaService.fiscalPeriod.findFirst.mockResolvedValue({
        id: 1,
        label: "Jan 2026",
        isClosed: true,
      });
      await expect(service.validateFiscalPeriod(1, new Date())).rejects.toThrow(BadRequestException);
    });

    it("should return the period if open", async () => {
      const mockPeriod = { id: 1, label: "Jan 2026", isClosed: false };
      mockPrismaService.fiscalPeriod.findFirst.mockResolvedValue(mockPeriod);
      const res = await service.validateFiscalPeriod(1, new Date());
      expect(res).toEqual(mockPeriod);
    });
  });

  describe("resolveAccount", () => {
    it("should resolve direct ACCOUNT_ID style strings", async () => {
      const res = await service.resolveAccount(1, "ACCOUNT_ID:42");
      expect(res).toBe(42);
    });

    it("should resolve mapped accounts if they exist", async () => {
      mockPrismaService.accountMapping.findUnique.mockResolvedValue({ accountId: 99 });
      const res = await service.resolveAccount(1, "ROLE_SALES_REVENUE");
      expect(res).toBe(99);
    });

    it("should resolve dynamic suspense account if strategy is USE_SUSPENSE_ACCOUNT", async () => {
      mockPrismaService.accountMapping.findUnique.mockResolvedValue(null);
      mockPrismaService.orgPostingConfig.findUnique.mockResolvedValue({
        suspenseAccountStrategy: "USE_SUSPENSE_ACCOUNT",
        suspenseAccountId: 100,
      });
      const res = await service.resolveAccount(1, "ROLE_SALES_REVENUE");
      expect(res).toBe(100);
    });
  });

  describe("postJournal", () => {
    it("should reject unbalanced debit and credit lines", async () => {
      mockPrismaService.fiscalPeriod.findFirst.mockResolvedValue({ id: 1, isClosed: false });
      mockPrismaService.accountMapping.findUnique.mockResolvedValue({ accountId: 10 });
      mockPrismaService.orgPostingConfig.findUnique.mockResolvedValue({ requiredDimensions: [] });

      await expect(
        service.postJournal({
          organizationId: 1,
          postingDate: new Date(),
          templateType: "INVOICE",
          sourceType: "Invoice",
          sourceId: 5,
          currency: "USD",
          createdBy: "system",
          lines: [
            { role: "ROLE_ACCOUNTS_RECEIVABLE", debit: 100, credit: 0 },
            { role: "ROLE_SALES_REVENUE", debit: 0, credit: 90 }, // Unbalanced by 10
          ],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it("should post journal and balance updates when balanced", async () => {
      mockPrismaService.fiscalPeriod.findFirst.mockResolvedValue({ id: 1, isClosed: false });
      mockPrismaService.accountMapping.findUnique.mockResolvedValue({ accountId: 10 });
      mockPrismaService.orgPostingConfig.findUnique.mockResolvedValue({ requiredDimensions: [] });
      mockPrismaService.journal.count.mockResolvedValue(0);
      mockPrismaService.journal.create.mockResolvedValue({ id: 22, journalNumber: "JV-20260724-0001" });

      const res = await service.postJournal({
        organizationId: 1,
        postingDate: new Date(),
        templateType: "INVOICE",
        sourceType: "Invoice",
        sourceId: 5,
        currency: "USD",
        createdBy: "system",
        lines: [
          { role: "ROLE_ACCOUNTS_RECEIVABLE", debit: 100, credit: 0 },
          { role: "ROLE_SALES_REVENUE", debit: 0, credit: 100 },
        ],
      });

      expect(res.id).toBe(22);
    });
  });
});
