import { Test, TestingModule } from "@nestjs/testing";
import { RecognitionSchedulerService } from "./recognition-scheduler.service";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerPostingService } from "./ledger-posting.service";
import { EventBusService } from "../event-bus/event-bus.service";

describe("RecognitionSchedulerService", () => {
  let service: RecognitionSchedulerService;
  let prisma: any;
  let ledgerPosting: any;
  let eventBus: any;

  const mockScheduleItem = (overrides: any = {}) => ({
    id: 1,
    organizationId: 1,
    scheduleId: 10,
    amount: 1000,
    status: "Scheduled",
    recognitionDate: new Date("2026-01-15"),
    idempotencyKey: "key-1",
    ...overrides,
    schedule: {
      id: 10,
      contract: { id: 1, organizationId: 1, contractNumber: "CTR-001" },
      obligation: {
        id: 1,
        name: "Software License",
        recognitionMethod: "STRAIGHT_LINE",
        deferredBalance: 12000,
        recognizedBalance: 0,
        allocatedAmount: 12000,
        prerequisiteObligationId: null,
      },
      ...(overrides.schedule || {}),
    },
  });

  beforeEach(async () => {
    prisma = {
      revenueScheduleItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      performanceObligation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      revenueAuditLog: {
        create: jest.fn(),
      },
      outboxRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    ledgerPosting = {
      postRevenueRecognition: jest.fn().mockResolvedValue({
        debitEntryId: 100,
        creditEntryId: 200,
        deferredRevenueAccountId: 10,
        revenueAccountId: 20,
      }),
    };

    eventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecognitionSchedulerService,
        { provide: PrismaService, useValue: prisma },
        { provide: LedgerPostingService, useValue: ledgerPosting },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<RecognitionSchedulerService>(RecognitionSchedulerService);
  });

  describe("recognizeItem", () => {
    it("should recognize a scheduled item", async () => {
      prisma.revenueScheduleItem.findUnique.mockResolvedValue(mockScheduleItem());

      const result = await service.recognizeItem(1);

      expect(result.status).toBe("recognized");
      expect(result.amount).toBe(1000);

      expect(ledgerPosting.postRevenueRecognition).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleItemId: 1,
          amount: 1000,
          contractNumber: "CTR-001",
        }),
      );

      expect(prisma.revenueScheduleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: "Recognized", ledgerEntryId: 100 }),
        }),
      );

      expect(prisma.performanceObligation.update).toHaveBeenCalled();
      expect(prisma.revenueAuditLog.create).toHaveBeenCalled();
      expect(prisma.outboxRecord.create).toHaveBeenCalled();

      expect(eventBus.emit).toHaveBeenCalledWith(
        "revenue.recognized",
        expect.objectContaining({ amount: 1000 }),
      );
    });

    it("should skip item that is not in Scheduled status", async () => {
      prisma.revenueScheduleItem.findUnique.mockResolvedValue(
        mockScheduleItem({ status: "Recognized" }),
      );

      const result = await service.recognizeItem(1);

      expect(result.status).toBe("skipped");
      expect(ledgerPosting.postRevenueRecognition).not.toHaveBeenCalled();
    });

    it("should skip item if prerequisite is not satisfied", async () => {
      prisma.revenueScheduleItem.findUnique.mockResolvedValue(
        mockScheduleItem({
          schedule: {
            contract: { id: 1, organizationId: 1, contractNumber: "CTR-001" },
            obligation: {
              id: 1,
              name: "Installation",
              recognitionMethod: "MILESTONE",
              deferredBalance: 5000,
              recognizedBalance: 0,
              allocatedAmount: 5000,
              prerequisiteObligationId: 2,
            },
          },
        }),
      );

      prisma.performanceObligation.findUnique.mockResolvedValue({
        id: 2,
        status: "NotStarted",
      });

      const result = await service.recognizeItem(1);
      expect(result.status).toBe("skipped");
      expect(result.error).toContain("Prerequisite");
    });

    it("should mark as failed if ledger posting fails", async () => {
      const item = mockScheduleItem();
      prisma.revenueScheduleItem.findUnique.mockResolvedValue(item);
      prisma.revenueScheduleItem.update.mockResolvedValue({});

      ledgerPosting.postRevenueRecognition.mockRejectedValue(
        new Error("Account mapping not configured"),
      );

      const result = await service.recognizeItem(1);
      expect(result.status).toBe("failed");
      expect(result.error).toContain("Account mapping not configured");
      expect(prisma.revenueScheduleItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ status: "Failed" }),
        }),
      );
    });
  });

  describe("processDueRecognitions", () => {
    it("should process multiple due items", async () => {
      const items = [
        mockScheduleItem({ id: 1 }),
        mockScheduleItem({ id: 2 }),
        mockScheduleItem({ id: 3 }),
      ];
      prisma.revenueScheduleItem.findMany.mockResolvedValue(items);
      prisma.revenueScheduleItem.findUnique.mockImplementation(
        ({ where: { id } }: any) => Promise.resolve(items.find((i: any) => i.id === id)),
      );

      const result = await service.processDueRecognitions();

      expect(result.processed).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
    });

    it("should return zeros when no items are due", async () => {
      prisma.revenueScheduleItem.findMany.mockResolvedValue([]);

      const result = await service.processDueRecognitions();

      expect(result.processed).toBe(0);
      expect(result.succeeded).toBe(0);
    });

    it("should handle failures gracefully", async () => {
      const items = [mockScheduleItem({ id: 1 })];
      prisma.revenueScheduleItem.findMany.mockResolvedValue(items);
      prisma.revenueScheduleItem.findUnique.mockImplementation(
        ({ where: { id } }: any) => Promise.resolve(items.find((i: any) => i.id === id)),
      );
      prisma.revenueScheduleItem.update.mockResolvedValue({});

      ledgerPosting.postRevenueRecognition.mockRejectedValue(
        new Error("Account mapping missing"),
      );

      const result = await service.processDueRecognitions();

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
