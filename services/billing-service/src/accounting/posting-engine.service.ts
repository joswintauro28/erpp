import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, PostingStatus } from "@prisma/client";

export interface JournalLineInput {
  role: string;
  debit: number;
  credit: number;
  dimensions?: Record<string, any>;
}

export interface JournalPostInput {
  organizationId: number;
  postingDate: Date;
  templateType: string;
  sourceType: string;
  sourceId: number;
  currency: string;
  exchangeRate?: number;
  createdBy: string;
  lines: JournalLineInput[];
}

@Injectable()
export class PostingEngineService {
  private readonly logger = new Logger(PostingEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Validate Fiscal Period (is open, exists, not locked)
  async validateFiscalPeriod(organizationId: number, date: Date) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: {
        organizationId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (!period) {
      throw new BadRequestException(`No active fiscal period defined for date ${date.toISOString().split("T")[0]}`);
    }

    if (period.isClosed) {
      throw new BadRequestException(`Fiscal period ${period.label} is closed. Postings are locked.`);
    }

    return period;
  }

  // 2. Resolve Account via mappings, with Suspense Strategy integration
  async resolveAccount(organizationId: number, role: string): Promise<number> {
    if (role.startsWith("ACCOUNT_ID:")) {
      return Number(role.split(":")[1]);
    }

    const mapping = await this.prisma.accountMapping.findUnique({

      where: {
        organizationId_role: { organizationId, role },
      },
    });

    if (mapping) return mapping.accountId;

    // Retrieve organization-specific suspense strategy configuration
    const config = await this.prisma.orgPostingConfig.findUnique({
      where: { organizationId },
    });

    if (config?.suspenseAccountStrategy === "USE_SUSPENSE_ACCOUNT" && config.suspenseAccountId) {
      this.logger.warn(`Mapping missing for role ${role}. Using Suspense Account id: ${config.suspenseAccountId}`);
      return config.suspenseAccountId;
    }

    // Fallback default mapping logic (similar to COGS service to make it robust)
    const defaultCodes: Record<string, { code: string; name: string; type: any }> = {
      ROLE_ACCOUNTS_RECEIVABLE: { code: "1200", name: "Accounts Receivable", type: "Asset" },
      ROLE_SALES_REVENUE: { code: "4100", name: "Sales Revenue", type: "Revenue" },
      ROLE_DEFERRED_REVENUE: { code: "2200", name: "Deferred Revenue", type: "Liability" },
      ROLE_CASH: { code: "1010", name: "Cash on Hand", type: "Asset" },
      ROLE_BANK: { code: "1020", name: "Bank Balance", type: "Asset" },
      ROLE_EXPENSE: { code: "5100", name: "Operating Expenses", type: "Expense" },
      ROLE_ACCOUNTS_PAYABLE: { code: "2100", name: "Accounts Payable", type: "Liability" },
      ROLE_TAX_PAYABLE: { code: "2300", name: "Tax Payable", type: "Liability" },
      ROLE_TAX_RECEIVABLE: { code: "1300", name: "Tax Receivable", type: "Asset" },
      ROLE_FREIGHT_REVENUE: { code: "4200", name: "Freight Revenue", type: "Revenue" },
      ROLE_FREIGHT_EXPENSE: { code: "5200", name: "Freight Expense", type: "Expense" },
      ROLE_DISCOUNT_ALLOWED: { code: "4300", name: "Discount Allowed", type: "Revenue" },
      ROLE_DISCOUNT_RECEIVED: { code: "5300", name: "Discount Received", type: "Expense" },
    };

    const target = defaultCodes[role];
    if (!target) {
      throw new NotFoundException(`No account mapping or default config for role ${role}`);
    }

    let account = await this.prisma.account.findFirst({
      where: { organizationId, code: target.code },
    });

    if (!account) {
      account = await this.prisma.account.create({
        data: {
          organizationId,
          code: target.code,
          name: target.name,
          type: target.type as any,
          subType: "Standard",
          balance: new Prisma.Decimal(0),
        },
      });
    }

    await this.prisma.accountMapping.upsert({
      where: { organizationId_role: { organizationId, role } },
      create: { organizationId, role, accountId: account.id },
      update: { accountId: account.id },
    });

    return account.id;
  }

  // 3. Generate Sequential Financial Journal Number
  async generateJournalNumber(tx: Prisma.TransactionClient, organizationId: number): Promise<string> {
    const config = await tx.orgPostingConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        numberingPrefix: "JV-",
        suspenseAccountStrategy: "REJECT_POSTING",
      },
      update: {},
    });

    const prefix = config.numberingPrefix || "JV-";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    
    // Concurrency protection: Lock or query for sequential numbering
    const count = await tx.journal.count({
      where: {
        organizationId,
        journalNumber: { startsWith: `${prefix}${dateStr}-` },
      },
    });

    const nextSeq = String(count + 1).padStart(4, "0");
    return `${prefix}${dateStr}-${nextSeq}`;
  }

  // 4. Core Journal Posting Pipeline
  async postJournal(input: JournalPostInput, txClient?: Prisma.TransactionClient): Promise<any> {
    const { organizationId, postingDate, templateType, sourceType, sourceId, currency, createdBy } = input;
    const rate = input.exchangeRate || 1.000000;

    // Validate fiscal period
    const period = await this.validateFiscalPeriod(organizationId, new Date(postingDate));

    // Resolve Account Mapping and Dimensions Config
    const config = await this.prisma.orgPostingConfig.findUnique({
      where: { organizationId },
    });
    const requiredDims: string[] = (config?.requiredDimensions as any) || [];

    // Balance checks: Debits must exactly equal Credits
    let debitSum = 0;
    let creditSum = 0;
    const resolvedLines: { accountId: number; debit: Prisma.Decimal; credit: Prisma.Decimal; dimensions: any }[] = [];

    for (const line of input.lines) {
      const accountId = await this.resolveAccount(organizationId, line.role);
      const debitVal = Number(line.debit || 0);
      const creditVal = Number(line.credit || 0);

      // Dimension Validation Check
      if (requiredDims.length > 0) {
        const dims = line.dimensions || {};
        for (const dim of requiredDims) {
          if (!dims[dim]) {
            throw new BadRequestException(`Accounting dimension '${dim}' is mandatory for account role ${line.role}`);
          }
        }
      }

      debitSum += debitVal;
      creditSum += creditVal;

      resolvedLines.push({
        accountId,
        debit: new Prisma.Decimal(debitVal),
        credit: new Prisma.Decimal(creditVal),
        dimensions: line.dimensions || {},
      });
    }

    // Balancing Validation Engine
    const difference = Math.abs(debitSum - creditSum);
    if (difference > 0.001) {
      throw new BadRequestException(`Journal entries must be balanced. Total Debits: ${debitSum}, Total Credits: ${creditSum}. Diff: ${difference}`);
    }

    const baseAmount = new Prisma.Decimal(debitSum * rate);

    const executeWork = async (tx: Prisma.TransactionClient) => {
      // 1. Generate Journal Number
      const journalNumber = await this.generateJournalNumber(tx, organizationId);

      // 2. Create Journal Header
      const journal = await tx.journal.create({
        data: {
          organizationId,
          journalNumber,
          postingDate: new Date(postingDate),
          fiscalPeriodId: period.id,
          status: PostingStatus.POSTED,
          templateType,
          sourceType,
          sourceId,
          currency,
          exchangeRate: new Prisma.Decimal(rate),
          baseAmount,
          reportingAmount: baseAmount,
          createdBy,
        },
      });

      // 3. Create Journal Lines & LedgerEntries
      for (const line of resolvedLines) {
        await tx.journalLine.create({
          data: {
            journalId: journal.id,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            dimensions: line.dimensions,
          },
        });

        // Write directly to General Ledger (ledger_entries)
        await tx.ledgerEntry.create({
          data: {
            organizationId,
            accountId: line.accountId,
            entryDate: new Date(postingDate),
            description: `JV:${journalNumber} - Ref: ${sourceType} #${sourceId}`,
            debit: line.debit,
            credit: line.credit,
            referenceType: sourceType,
            referenceId: sourceId,
            dimensions: line.dimensions,
          },
        });

        // Update Account Balances
        await tx.account.update({
          where: { id: line.accountId },
          data: {
            balance: {
              increment: new Prisma.Decimal(Number(line.debit) - Number(line.credit)),
            },
          },
        });
      }

      // 4. Log to Outbox Pattern
      await tx.outboxRecord.create({
        data: {
          organizationId,
          eventId: `JournalPosted-${journal.id}`,
          eventType: "Journal.Posted",
          schemaVersion: "1.0",
          payload: {
            journalId: journal.id,
            journalNumber,
            sourceType,
            sourceId,
          } as any,
          status: "PENDING",
        },
      });


      return journal;
    };

    if (txClient) {
      return executeWork(txClient);
    } else {
      return this.prisma.$transaction(async (tx) => executeWork(tx));
    }
  }

  // 5. Generate Reversal Journal
  async reverseJournal(
    organizationId: number,
    journalId: number,
    reason: string,
    createdBy: string,
    txClient?: Prisma.TransactionClient,
  ): Promise<any> {
    const journal = await this.prisma.journal.findFirst({
      where: { id: journalId, organizationId },
      include: { lines: true },
    });

    if (!journal) {
      throw new NotFoundException(`Journal ID ${journalId} not found`);
    }

    if (journal.status === PostingStatus.REVERSED) {
      throw new BadRequestException(`Journal ${journal.journalNumber} is already reversed.`);
    }

    const executeWork = async (tx: Prisma.TransactionClient) => {
      const reversalNumber = await this.generateJournalNumber(tx, organizationId);
      const period = await this.validateFiscalPeriod(organizationId, new Date());

      const reversalJournal = await tx.journal.create({
        data: {
          organizationId,
          journalNumber: reversalNumber,
          postingDate: new Date(),
          fiscalPeriodId: period.id,
          status: PostingStatus.REVERSED,
          templateType: `${journal.templateType}_REVERSAL`,
          sourceType: journal.sourceType,
          sourceId: journal.sourceId,
          currency: journal.currency,
          exchangeRate: journal.exchangeRate,
          baseAmount: journal.baseAmount,
          reportingAmount: journal.reportingAmount,
          createdBy,
          reversalRefId: journal.id,
        },
      });

      for (const line of journal.lines) {
        await tx.journalLine.create({
          data: {
            journalId: reversalJournal.id,
            accountId: line.accountId,
            debit: line.credit, // Reversed
            credit: line.debit,  // Reversed
            dimensions: line.dimensions || undefined,
          },
        });

        // Write reversing ledger entry
        await tx.ledgerEntry.create({
          data: {
            organizationId,
            accountId: line.accountId,
            entryDate: new Date(),
            description: `REVERSAL of JV:${journal.journalNumber} - Reason: ${reason}`,
            debit: line.credit,
            credit: line.debit,
            referenceType: journal.sourceType,
            referenceId: journal.sourceId,
            dimensions: line.dimensions || undefined,
          },
        });

        // Update Account Balance
        await tx.account.update({
          where: { id: line.accountId },
          data: {
            balance: {
              increment: new Prisma.Decimal(Number(line.credit) - Number(line.debit)),
            },
          },
        });
      }

      // Mark original journal as reversed
      await tx.journal.update({
        where: { id: journal.id },
        data: {
          status: PostingStatus.REVERSED,
        },
      });

      // Emits outbox reversal event
      await tx.outboxRecord.create({
        data: {
          organizationId,
          eventId: `JournalReversed-${reversalJournal.id}`,
          eventType: "Journal.Reversed",
          schemaVersion: "1.0",
          payload: {
            originalJournalId: journal.id,
            reversalJournalId: reversalJournal.id,
            journalNumber: reversalNumber,
          } as any,
          status: "PENDING",
        },
      });


      return reversalJournal;
    };

    if (txClient) {
      return executeWork(txClient);
    } else {
      return this.prisma.$transaction(async (tx) => executeWork(tx));
    }
  }

}
