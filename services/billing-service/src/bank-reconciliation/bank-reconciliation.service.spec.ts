import { Test, TestingModule } from "@nestjs/testing";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

describe("BankReconciliationService", () => {
  let service: BankReconciliationService;
  let prisma: any;
  const orgId = 1;

  beforeEach(async () => {
    prisma = {
      bankTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      ledgerEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        aggregate: jest.fn(),
      },
      reconciliationToleranceRule: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      reconciliationAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      accountMapping: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankReconciliationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BankReconciliationService>(BankReconciliationService);
  });

  describe("importCsv & Parsing", () => {
    it("should parse CSV and create bank transactions", async () => {
      const csv = `Date,Description,Reference,Debit,Credit,Balance\n2026-07-24,Test Payment,REF-123,0,1000,1000`;
      prisma.bankTransaction.findFirst.mockResolvedValue(null); // No duplicates
      prisma.reconciliationToleranceRule.findUnique.mockResolvedValue({
        amountTolerance: new Prisma.Decimal(0.00),
        dateToleranceDays: 3,
        matchByReference: true,
        matchByPaymentMethod: true,
        matchByLedger: true,
      });
      prisma.bankTransaction.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.ledgerEntry.findMany.mockResolvedValue([]);

      const result = await service.importCsv(orgId, csv);

      expect(result.imported).toBe(1);
      expect(prisma.bankTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            description: "Test Payment",
            reference: "REF-123",
            credit: new Prisma.Decimal(1000),
          }),
        }),
      );
    });

    it("should classify incoming duplicate transactions as Duplicate", async () => {
      const csv = `Date,Description,Reference,Debit,Credit,Balance\n2026-07-24,Duplicate Item,REF-999,500,0,500`;
      // Return a matching record to simulate duplicate
      prisma.bankTransaction.findFirst.mockResolvedValue({ id: 99 });
      prisma.reconciliationToleranceRule.findUnique.mockResolvedValue({
        amountTolerance: new Prisma.Decimal(0.00),
        dateToleranceDays: 3,
        matchByReference: true,
        matchByPaymentMethod: true,
        matchByLedger: true,
      });
      prisma.bankTransaction.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.ledgerEntry.findMany.mockResolvedValue([]);

      const result = await service.importCsv(orgId, csv);
      expect(result.imported).toBe(1);
      expect(prisma.bankTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classification: "Duplicate",
          }),
        }),
      );
    });
  });

  describe("Auto-matching Engine", () => {
    it("should match 100% on payment with correct amount and reference score", async () => {
      const mockTx = {
        id: 1,
        organizationId: orgId,
        transactionDate: new Date("2026-07-24T12:00:00Z"),
        description: "Payment REF-123",
        reference: "REF-123",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(1500),
        balance: new Prisma.Decimal(1500),
        classification: "Unmatched",
        importBatch: "BATCH-1",
      };

      const mockPayment = {
        id: 10,
        organizationId: orgId,
        amount: new Prisma.Decimal(1500),
        paymentDate: new Date("2026-07-24T08:00:00Z"),
        referenceId: "REF-123",
        status: "completed",
      };

      prisma.reconciliationToleranceRule.findUnique.mockResolvedValue({
        amountTolerance: new Prisma.Decimal(0.00),
        dateToleranceDays: 3,
        matchByReference: true,
        matchByPaymentMethod: true,
        matchByLedger: true,
      });

      prisma.bankTransaction.findMany.mockResolvedValue([mockTx]);
      prisma.payment.findMany.mockResolvedValue([mockPayment]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.ledgerEntry.findMany.mockResolvedValue([]);

      await service.autoMatch(orgId, "BATCH-1");

      expect(prisma.bankTransaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          matchedPaymentId: 10,
          classification: "Matched",
        }),
      });
      expect(prisma.reconciliationAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: "AUTO_MATCH",
            bankTransactionId: 1,
            matchedPaymentId: 10,
          }),
        }),
      );
    });

    it("should classify as Partial_Match if match exists but amount is within tolerance rule window", async () => {
      const mockTx = {
        id: 1,
        organizationId: orgId,
        transactionDate: new Date("2026-07-24T12:00:00Z"),
        description: "Payment REF-123",
        reference: "REF-123",
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(1502), // 2 dollar diff
        balance: new Prisma.Decimal(1502),
        classification: "Unmatched",
        importBatch: "BATCH-1",
      };

      const mockPayment = {
        id: 10,
        organizationId: orgId,
        amount: new Prisma.Decimal(1500),
        paymentDate: new Date("2026-07-24T08:00:00Z"),
        referenceId: "REF-123",
        status: "completed",
      };

      prisma.reconciliationToleranceRule.findUnique.mockResolvedValue({
        amountTolerance: new Prisma.Decimal(5.00), // Tolerance allows 5.00 diff
        dateToleranceDays: 3,
        matchByReference: true,
        matchByPaymentMethod: true,
        matchByLedger: true,
      });

      prisma.bankTransaction.findMany.mockResolvedValue([mockTx]);
      prisma.payment.findMany.mockResolvedValue([mockPayment]);
      prisma.invoice.findMany.mockResolvedValue([]);
      prisma.ledgerEntry.findMany.mockResolvedValue([]);

      await service.autoMatch(orgId, "BATCH-1");

      expect(prisma.bankTransaction.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          matchedPaymentId: 10,
          classification: "Partial_Match",
        }),
      });
    });
  });

  describe("Manual Reconciliation & Auditing", () => {
    it("should match manually, log transaction update and audit logs", async () => {
      const mockTx = {
        id: 50,
        organizationId: orgId,
        reference: "REF-MANUAL",
        debit: new Prisma.Decimal(100),
        credit: new Prisma.Decimal(0),
      };

      prisma.bankTransaction.findFirst.mockResolvedValue(mockTx);
      prisma.payment.findFirst.mockResolvedValue({ id: 80, organizationId: orgId });

      const result = await service.matchTransactionManual(
        orgId,
        50,
        "payment",
        80,
        0,
        "Verified reference manually",
        "auditor@company.com",
      );

      expect(result).toEqual({ message: "Transaction reconciled successfully" });
      expect(prisma.bankTransaction.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: expect.objectContaining({
          matchedPaymentId: 80,
          classification: "Matched",
          reconciledBy: "auditor@company.com",
        }),
      });
      expect(prisma.reconciliationAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actionType: "MANUAL_RECONCILE",
            bankTransactionId: 50,
            matchedPaymentId: 80,
            performedBy: "auditor@company.com",
          }),
        }),
      );
    });

    it("should create adjusting entry if non-zero adjustment is made", async () => {
      const mockTx = {
        id: 50,
        organizationId: orgId,
        reference: "REF-MANUAL",
        debit: new Prisma.Decimal(100),
        credit: new Prisma.Decimal(0),
      };

      prisma.bankTransaction.findFirst.mockResolvedValue(mockTx);
      prisma.payment.findFirst.mockResolvedValue({ id: 80, organizationId: orgId });
      prisma.accountMapping.findFirst.mockResolvedValue({ accountId: 999 });

      await service.matchTransactionManual(
        orgId,
        50,
        "payment",
        80,
        -10, // -10 adjustment
        "Reconciled with 10 bank charge adjustment",
        "auditor@company.com",
      );

      expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            accountId: 999,
            debit: new Prisma.Decimal(10),
          }),
        }),
      );
    });
  });
});
