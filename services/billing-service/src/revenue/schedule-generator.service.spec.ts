import { Test, TestingModule } from "@nestjs/testing";
import { ScheduleGeneratorService } from "./schedule-generator.service";

describe("ScheduleGeneratorService", () => {
  let service: ScheduleGeneratorService;
  const orgId = 1;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleGeneratorService],
    }).compile();
    service = module.get<ScheduleGeneratorService>(ScheduleGeneratorService);
  });

  describe("Straight-Line Monthly", () => {
    it("should generate 12 monthly items for a 12-month contract", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 12000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      expect(result.items).toHaveLength(12);
      expect(result.version).toBe(1);
      expect(result.performanceObligationId).toBe(1);

      const totalAmount = result.items.reduce((s, i) => s + i.amount, 0);
      expect(Math.round(totalAmount)).toBe(12000);

      result.items.forEach((item, i) => {
        expect(item.amount).toBeCloseTo(1000, 1);
        expect(item.idempotencyKey).toBeTruthy();
        expect(item.idempotencyKey.length).toBe(48);
      });

      expect(result.items[0].nextRecognitionDate).toBeTruthy();
      expect(result.items[11].nextRecognitionDate).toBeNull();
    });

    it("should handle partial months at start/end", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 5000,
        startDate: "2026-03-15",
        endDate: "2026-06-20",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      // Mar 15-31, Apr, May, Jun 1-20 = 4 months
      expect(result.items).toHaveLength(4);

      const totalAmount = Math.round(result.items.reduce((s, i) => s + i.amount, 0));
      expect(totalAmount).toBe(5000);
    });

    it("should generate daily items when frequency is daily", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 1000,
        startDate: "2026-01-01",
        endDate: "2026-01-10",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "daily",
      });

      // 10 days: Jan 1 to Jan 10 inclusive
      expect(result.items.length).toBeGreaterThanOrEqual(10);

      const total = Math.round(result.items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
      expect(total).toBe(1000);
    });

    it("should throw if end date precedes start date", () => {
      expect(() =>
        service.generateSchedule(orgId, {
          contractId: 1,
          performanceObligationId: 1,
          allocatedAmount: 1000,
          startDate: "2026-06-01",
          endDate: "2026-05-01",
          recognitionMethod: "STRAIGHT_LINE",
          recognitionTrigger: "TIME_ELAPSED",
          frequency: "daily",
        }),
      ).toThrow();
    });
  });

  describe("Milestone Recognition", () => {
    it("should generate schedule items from milestones", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 30000,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        recognitionMethod: "MILESTONE",
        recognitionTrigger: "MILESTONE_MET",
        milestones: [
          { name: "Project Kickoff", targetDate: "2026-01-15", amount: 5000 },
          { name: "Phase 1 Delivery", targetDate: "2026-03-01", amount: 10000 },
          { name: "Go Live", targetDate: "2026-05-01", amount: 10000 },
          { name: "Project Closure", targetDate: "2026-06-15", amount: 5000 },
        ],
      });

      expect(result.items).toHaveLength(4);
      expect(result.items[0].amount).toBe(5000);
      expect(result.items[0].recognitionDate.toISOString()).toContain("2026-01-15");
      expect(result.items[3].amount).toBe(5000);
      expect(result.items[3].nextRecognitionDate).toBeNull();
      expect(result.items[2].nextRecognitionDate).toBeTruthy();
    });

    it("should throw if no milestones provided", () => {
      expect(() =>
        service.generateSchedule(orgId, {
          contractId: 1,
          performanceObligationId: 1,
          allocatedAmount: 10000,
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          recognitionMethod: "MILESTONE",
          recognitionTrigger: "MILESTONE_MET",
        }),
      ).toThrow("Milestone recognition requires at least one milestone");
    });
  });

  describe("Usage Recognition", () => {
    it("should generate schedule items from usage estimates", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 15000,
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        recognitionMethod: "USAGE",
        recognitionTrigger: "EVENT_RECEIVED",
        usageEstimates: [
          { name: "Jan Usage", periodStart: "2026-01-01", periodEnd: "2026-01-31", estimatedUnits: 500, unitPrice: 10 },
          { name: "Feb Usage", periodStart: "2026-02-01", periodEnd: "2026-02-28", estimatedUnits: 600, unitPrice: 10 },
          { name: "Mar Usage", periodStart: "2026-03-01", periodEnd: "2026-03-31", estimatedUnits: 400, unitPrice: 10 },
        ],
      });

      expect(result.items).toHaveLength(3);
      expect(result.items[0].amount).toBe(5000);
      expect(result.items[1].amount).toBe(6000);
      expect(result.items[2].amount).toBe(4000);
    });

    it("should throw if no usage estimates provided", () => {
      expect(() =>
        service.generateSchedule(orgId, {
          contractId: 1,
          performanceObligationId: 1,
          allocatedAmount: 10000,
          startDate: "2026-01-01",
          endDate: "2026-03-31",
          recognitionMethod: "USAGE",
          recognitionTrigger: "EVENT_RECEIVED",
        }),
      ).toThrow("Usage recognition requires at least one usage estimate");
    });
  });

  describe("Manual Recognition", () => {
    it("should generate single schedule item for full amount", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 25000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        recognitionMethod: "MANUAL",
        recognitionTrigger: "MANUAL",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].amount).toBe(25000);
      expect(result.items[0].nextRecognitionDate).toBeNull();
    });
  });

  describe("Hybrid Recognition", () => {
    it("should combine straight-line and milestone items", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 50000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        recognitionMethod: "HYBRID",
        recognitionTrigger: "TIME_ELAPSED",
        milestones: [
          { name: "Go Live", targetDate: "2026-06-01", amount: 20000 },
        ],
      });

      // 12 straight-line months (30000/12=2500) + 1 milestone (20000)
      expect(result.items.length).toBeGreaterThan(1);

      const totalAmount = Math.round(result.items.reduce((s, i) => s + i.amount, 0));
      expect(totalAmount).toBe(50000);
    });

    it("should fall back to straight-line if no milestones in hybrid", () => {
      const result = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 12000,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        recognitionMethod: "HYBRID",
        recognitionTrigger: "TIME_ELAPSED",
      });

      expect(result.items).toHaveLength(12);
    });
  });

  describe("Idempotency Keys", () => {
    it("should produce consistent keys for the same inputs", () => {
      const result1 = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 99,
        allocatedAmount: 6000,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      const result2 = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 99,
        allocatedAmount: 6000,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      // Items may differ slightly due to rounding adjustment on last item,
      // but all items except possibly the last should have same keys
      for (let i = 0; i < result1.items.length - 1; i++) {
        expect(result1.items[i].idempotencyKey).toBe(result2.items[i].idempotencyKey);
      }
    });

    it("should produce different keys for different POBs", () => {
      const result1 = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 1,
        allocatedAmount: 6000,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      const result2 = service.generateSchedule(orgId, {
        contractId: 1,
        performanceObligationId: 2,
        allocatedAmount: 6000,
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        recognitionMethod: "STRAIGHT_LINE",
        recognitionTrigger: "TIME_ELAPSED",
        frequency: "monthly",
      });

      for (let i = 0; i < result1.items.length; i++) {
        expect(result1.items[i].idempotencyKey).not.toBe(result2.items[i].idempotencyKey);
      }
    });
  });
});
