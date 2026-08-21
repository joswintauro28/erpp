import { Test, TestingModule } from "@nestjs/testing";
import { SspAllocationService } from "./ssp-allocation.service";

describe("SspAllocationService", () => {
  let service: SspAllocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SspAllocationService],
    }).compile();

    service = module.get<SspAllocationService>(SspAllocationService);
  });

  describe("Relative SSP Allocation", () => {
    it("should allocate transaction price proportionally across POBs", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-001",
        transactionPrice: 9000,
        variableConsiderations: [],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "Software License",
            sspValue: 6000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
          {
            externalObligationId: "POB-002",
            obligationNumber: "POB-002-01",
            name: "12-Month Support",
            sspValue: 3000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
          {
            externalObligationId: "POB-003",
            obligationNumber: "POB-003-01",
            name: "User Training",
            sspValue: 1000,
            recognitionMethod: "MANUAL",
            recognitionTrigger: "EVENT_RECEIVED",
          },
        ],
      });

      expect(result.contractId).toBe("CTR-001");
      expect(result.transactionPrice).toBe(9000);
      expect(result.totalSspSum).toBe(10000);
      expect(result.adjustedTransactionPrice).toBe(9000);
      expect(result.performanceObligations).toHaveLength(3);

      expect(result.performanceObligations[0].allocatedAmount).toBe(5400);
      expect(result.performanceObligations[0].allocationRatio).toBe(0.6);

      expect(result.performanceObligations[1].allocatedAmount).toBe(2700);
      expect(result.performanceObligations[1].allocationRatio).toBe(0.3);

      expect(result.performanceObligations[2].allocatedAmount).toBe(900);
      expect(result.performanceObligations[2].allocationRatio).toBeCloseTo(0.1, 10);
    });

    it("should handle single POB (100% allocation)", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-002",
        transactionPrice: 5000,
        variableConsiderations: [],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "License Only",
            sspValue: 5000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
        ],
      });

      expect(result.performanceObligations[0].allocatedAmount).toBe(5000);
      expect(result.performanceObligations[0].allocationRatio).toBe(1);
    });
  });

  describe("Variable Consideration", () => {
    it("should include fully constrained variable consideration in adjusted price", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-003",
        transactionPrice: 100000,
        variableConsiderations: [
          { type: "PERFORMANCE_BONUS", estimatedAmount: 20000, confidenceLevel: 0.95 },
        ],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "Software License",
            sspValue: 80000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
          {
            externalObligationId: "POB-002",
            obligationNumber: "POB-002-01",
            name: "Implementation",
            sspValue: 40000,
            recognitionMethod: "MILESTONE",
            recognitionTrigger: "MILESTONE_MET",
          },
        ],
      });

      expect(result.variableConsiderationsTotal).toBe(20000);
      expect(result.adjustedTransactionPrice).toBe(120000);
      expect(result.performanceObligations[0].allocatedAmount).toBe(80000);
      expect(result.performanceObligations[1].allocatedAmount).toBe(40000);
    });

    it("should apply confidence-based discount for uncertain variables", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-004",
        transactionPrice: 50000,
        variableConsiderations: [
          { type: "BONUS", estimatedAmount: 10000, confidenceLevel: 0.6 },
        ],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "Service",
            sspValue: 50000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
        ],
      });

      expect(result.variableConsiderationsTotal).toBe(6000);
      expect(result.adjustedTransactionPrice).toBe(56000);
    });

    it("should exclude variable considerations with very low confidence (< 0.5)", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-005",
        transactionPrice: 30000,
        variableConsiderations: [
          { type: "BONUS", estimatedAmount: 15000, confidenceLevel: 0.3 },
        ],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "Service",
            sspValue: 30000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
        ],
      });

      expect(result.variableConsiderationsTotal).toBe(0);
      expect(result.adjustedTransactionPrice).toBe(30000);
    });

    it("should handle multiple variable considerations", () => {
      const result = service.allocateTransactionPrice({
        externalContractId: "CTR-006",
        transactionPrice: 80000,
        variableConsiderations: [
          { type: "DISCOUNT", estimatedAmount: -5000, confidenceLevel: 1.0 },
          { type: "BONUS", estimatedAmount: 10000, confidenceLevel: 0.9 },
          { type: "INCENTIVE", estimatedAmount: 3000, confidenceLevel: 0.7 },
        ],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "Service",
            sspValue: 80000,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
        ],
      });

      expect(result.variableConsiderationsTotal).toBe(7100);
      expect(result.adjustedTransactionPrice).toBe(87100);
    });
  });

  describe("Error Handling", () => {
    it("should throw if no POBs provided", () => {
      expect(() =>
        service.allocateTransactionPrice({
          externalContractId: "CTR-ERR",
          transactionPrice: 1000,
          variableConsiderations: [],
          performanceObligations: [],
        }),
      ).toThrow("At least one performance obligation is required");
    });

    it("should throw if negative transaction price", () => {
      expect(() =>
        service.allocateTransactionPrice({
          externalContractId: "CTR-ERR",
          transactionPrice: -100,
          variableConsiderations: [],
          performanceObligations: [
            {
              externalObligationId: "POB-001",
              obligationNumber: "POB-001-01",
              name: "Test",
              sspValue: 100,
              recognitionMethod: "STRAIGHT_LINE",
              recognitionTrigger: "TIME_ELAPSED",
            },
          ],
        }),
      ).toThrow("Transaction price cannot be negative");
    });

    it("should throw if total SSP is zero", () => {
      expect(() =>
        service.allocateTransactionPrice({
          externalContractId: "CTR-ERR",
          transactionPrice: 1000,
          variableConsiderations: [],
          performanceObligations: [
            {
              externalObligationId: "POB-001",
              obligationNumber: "POB-001-01",
              name: "Test",
              sspValue: 0,
              recognitionMethod: "STRAIGHT_LINE",
              recognitionTrigger: "TIME_ELAPSED",
            },
          ],
        }),
      ).toThrow("Total SSP sum must be greater than zero");
    });
  });

  describe("Custom Ratio Allocation", () => {
    it("should allocate by custom ratios", () => {
      const result = service.allocateByCustomRatios({
        externalContractId: "CTR-CUSTOM",
        transactionPrice: 10000,
        variableConsiderations: [],
        performanceObligations: [
          {
            externalObligationId: "POB-001",
            obligationNumber: "POB-001-01",
            name: "License",
            customRatio: 0.7,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
          {
            externalObligationId: "POB-002",
            obligationNumber: "POB-002-01",
            name: "Support",
            customRatio: 0.3,
            recognitionMethod: "STRAIGHT_LINE",
            recognitionTrigger: "TIME_ELAPSED",
          },
        ],
      });

      expect(result.performanceObligations[0].allocatedAmount).toBe(7000);
      expect(result.performanceObligations[1].allocatedAmount).toBe(3000);
    });

    it("should throw if custom ratios do not sum to 1.0", () => {
      expect(() =>
        service.allocateByCustomRatios({
          externalContractId: "CTR-ERR",
          transactionPrice: 10000,
          variableConsiderations: [],
          performanceObligations: [
            {
              externalObligationId: "POB-001",
              obligationNumber: "POB-001-01",
              name: "License",
              customRatio: 0.5,
              recognitionMethod: "STRAIGHT_LINE",
              recognitionTrigger: "TIME_ELAPSED",
            },
            {
              externalObligationId: "POB-002",
              obligationNumber: "POB-002-01",
              name: "Support",
              customRatio: 0.3,
              recognitionMethod: "STRAIGHT_LINE",
              recognitionTrigger: "TIME_ELAPSED",
            },
          ],
        }),
      ).toThrow("Custom ratios must sum to 1.0");
    });
  });
});
