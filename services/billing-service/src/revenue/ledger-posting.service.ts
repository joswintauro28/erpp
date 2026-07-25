import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

export interface PostRecognitionInput {
  organizationId: number;
  scheduleItemId: number;
  amount: number;
  recognitionDate: Date;
  contractId: number;
  contractNumber: string;
  performanceObligationId: number;
  pobName: string;
  recognitionMethod: string;
}

export interface PostRecognitionResult {
  debitEntryId: number;
  creditEntryId: number;
  deferredRevenueAccountId: number;
  revenueAccountId: number;
}

@Injectable()
export class LedgerPostingService {
  private readonly logger = new Logger(LedgerPostingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async postRevenueRecognition(input: PostRecognitionInput): Promise<PostRecognitionResult> {
    const { organizationId, amount, recognitionDate } = input;

    const [deferredRevenueAccount, revenueAccount] = await Promise.all([
      this.prisma.accountMapping.findUnique({
        where: { organizationId_role: { organizationId, role: "ROLE_DEFERRED_REVENUE" } },
        include: { account: true },
      }),
      this.prisma.accountMapping.findUnique({
        where: { organizationId_role: { organizationId, role: "ROLE_SALES_REVENUE" } },
        include: { account: true },
      }),
    ]);

    if (!deferredRevenueAccount) {
      throw new NotFoundException(
        `No Deferred Revenue account mapping found for org ${organizationId}. Set up ROLE_DEFERRED_REVENUE in account_mappings.`,
      );
    }
    if (!revenueAccount) {
      throw new NotFoundException(
        `No Sales Revenue account mapping found for org ${organizationId}. Set up ROLE_SALES_REVENUE in account_mappings.`,
      );
    }

    const decimalAmount = new Prisma.Decimal(amount);
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const debitEntry = await tx.ledgerEntry.create({
        data: {
          organizationId,
          accountId: deferredRevenueAccount.accountId,
          entryDate: recognitionDate,
          description: `Revenue recognition: ${input.pobName} (${input.contractNumber})`,
          debit: decimalAmount,
          credit: 0,
          referenceType: "RevenueRecognition",
          referenceId: input.scheduleItemId,
        },
      });

      const creditEntry = await tx.ledgerEntry.create({
        data: {
          organizationId,
          accountId: revenueAccount.accountId,
          entryDate: recognitionDate,
          description: `Revenue recognition: ${input.pobName} (${input.contractNumber})`,
          debit: 0,
          credit: decimalAmount,
          referenceType: "RevenueRecognition",
          referenceId: input.scheduleItemId,
        },
      });

      await tx.account.update({
        where: { id: deferredRevenueAccount.accountId },
        data: { balance: { decrement: decimalAmount } },
      });

      await tx.account.update({
        where: { id: revenueAccount.accountId },
        data: { balance: { increment: decimalAmount } },
      });

      return { debitEntryId: debitEntry.id, creditEntryId: creditEntry.id };
    });

    this.logger.log(
      `Posted revenue recognition: ${amount} (item ${input.scheduleItemId}, POB ${input.performanceObligationId})`,
    );

    return {
      ...result,
      deferredRevenueAccountId: deferredRevenueAccount.accountId,
      revenueAccountId: revenueAccount.accountId,
    };
  }

  async reverseRecognition(
    organizationId: number,
    scheduleItemId: number,
    amount: number,
    reason: string,
    performedBy: string,
  ): Promise<PostRecognitionResult> {
    const scheduleItem = await this.prisma.revenueScheduleItem.findFirst({
      where: { id: scheduleItemId, organizationId },
      include: {
        schedule: {
          include: { contract: true, obligation: true },
        },
      },
    });

    if (!scheduleItem) throw new NotFoundException("Schedule item not found");
    if (scheduleItem.status !== "Recognized") {
      throw new Error(`Schedule item ${scheduleItemId} is not in Recognized status`);
    }

    const reversalDate = new Date();
    const decimalAmount = new Prisma.Decimal(amount);

    const [deferredRevenueAccount, revenueAccount] = await Promise.all([
      this.prisma.accountMapping.findUnique({
        where: { organizationId_role: { organizationId, role: "ROLE_DEFERRED_REVENUE" } },
        include: { account: true },
      }),
      this.prisma.accountMapping.findUnique({
        where: { organizationId_role: { organizationId, role: "ROLE_SALES_REVENUE" } },
        include: { account: true },
      }),
    ]);

    if (!deferredRevenueAccount || !revenueAccount) {
      throw new NotFoundException("Revenue or deferred revenue account mapping not found");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const debitEntry = await tx.ledgerEntry.create({
        data: {
          organizationId,
          accountId: revenueAccount.accountId,
          entryDate: reversalDate,
          description: `REVERSAL: ${reason} (item ${scheduleItemId})`,
          debit: decimalAmount,
          credit: 0,
          referenceType: "RevenueReversal",
          referenceId: scheduleItemId,
        },
      });

      const creditEntry = await tx.ledgerEntry.create({
        data: {
          organizationId,
          accountId: deferredRevenueAccount.accountId,
          entryDate: reversalDate,
          description: `REVERSAL: ${reason} (item ${scheduleItemId})`,
          debit: 0,
          credit: decimalAmount,
          referenceType: "RevenueReversal",
          referenceId: scheduleItemId,
        },
      });

      await tx.account.update({
        where: { id: revenueAccount.accountId },
        data: { balance: { decrement: decimalAmount } },
      });

      await tx.account.update({
        where: { id: deferredRevenueAccount.accountId },
        data: { balance: { increment: decimalAmount } },
      });

      await tx.revenueScheduleItem.update({
        where: { id: scheduleItemId },
        data: { status: "Reversed" },
      });

      await tx.revenueAuditLog.create({
        data: {
          organizationId,
          scheduleId: scheduleItem.scheduleId,
          action: "REVENUE_REVERSED",
          details: `Reversal: ${reason}. Amount: ${amount}. Performed by: ${performedBy}`,
          performedBy,
        },
      });

      return { debitEntryId: debitEntry.id, creditEntryId: creditEntry.id };
    });

    return {
      ...result,
      deferredRevenueAccountId: deferredRevenueAccount.accountId,
      revenueAccountId: revenueAccount.accountId,
    };
  }
}
