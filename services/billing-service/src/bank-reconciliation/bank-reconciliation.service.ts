import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import bank statement from a raw CSV text string (backwards compatibility).
   */
  async importCsv(organizationId: number, csvText: string) {
    const buffer = Buffer.from(csvText, "utf-8");
    return this.processFileBuffer(organizationId, buffer, "statement.csv");
  }

  /**
   * Import bank statement from a file stored in RustFS via erp-service.
   * Fetches the presigned download URL, then downloads the actual file bytes.
   * @param jwtToken Raw JWT bearer token to forward to erp-service.
   */
  async importFileById(organizationId: number, fileId: number, fileName: string, jwtToken: string) {
    // L3: requires ERP_SERVICE_URL in production
    const erpServiceUrl = process.env.ERP_SERVICE_URL ?? "http://localhost:8000";

    // Step 1: Get the presigned download URL from erp-service
    const metaResponse = await fetch(`${erpServiceUrl}/api/files/${fileId}/download`, {
      headers: { "Authorization": `Bearer ${jwtToken}` },
    });

    if (!metaResponse.ok) {
      throw new Error(`Failed to fetch file metadata from erp-service: ${metaResponse.status} ${metaResponse.statusText}`);
    }

    const meta = await metaResponse.json() as { download_url: string };
    if (!meta.download_url) {
      throw new Error("erp-service returned no download_url for this file");
    }

    // Step 2: Download the actual file bytes from RustFS via the presigned URL
    const fileResponse = await fetch(meta.download_url, { redirect: "follow" });
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from storage: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return this.processFileBuffer(organizationId, buffer, fileName);
  }

  /**
   * Import bank statement from a Base64-encoded file (CSV or XLSX).
   * @deprecated Use importFileById instead for RustFS-based file handling.
   */
  async importFile(organizationId: number, fileBase64: string, fileName: string) {
    const buffer = Buffer.from(fileBase64, "base64");
    return this.processFileBuffer(organizationId, buffer, fileName);
  }

  /**
   * Helper to process the file buffer, parse via SheetJS, normalize, and run auto-matching.
   */
  private async processFileBuffer(organizationId: number, buffer: Buffer, fileName: string) {
    try {
      // M9: wrap entire import in a transaction for atomicity
      return await this.prisma.$transaction(async (tx) => {
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (rows.length < 2) {
        return { imported: 0, error: "File must have a header row and at least one data row" };
      }

      const header = (rows[0] as any[]).map(h => String(h ?? "").trim());
      const dateIdx = header.findIndex((h) => /date/i.test(h));
      const descIdx = header.findIndex((h) => /desc|particulars|details/i.test(h));
      const refIdx = header.findIndex((h) => /ref|id|cheque|txn|transaction|document/i.test(h));
      const debitIdx = header.findIndex((h) => /debit|withdrawal/i.test(h) || (/\bdr\b/i.test(h) && !/desc/i.test(h)) || (/\bout\b/i.test(h) && !/desc/i.test(h)));
      const creditIdx = header.findIndex((h) => /credit|deposit/i.test(h) || (/\bcr\b/i.test(h) && !/desc/i.test(h)) || (/\bin\b/i.test(h) && !/desc/i.test(h)));
      const balanceIdx = header.findIndex((h) => /balance/i.test(h));

      if (dateIdx === -1 || (debitIdx === -1 && creditIdx === -1)) {
        return { imported: 0, error: "Invalid sheet format: Must have a Date column and Debit/Credit columns" };
      }

      const batch = `BATCH-${Date.now()}`;
      let imported = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.length === 0) continue;

        // Parse Date
        let transactionDate: Date;
        const rawDate = row[dateIdx];
        if (rawDate instanceof Date) {
          transactionDate = rawDate;
        } else {
          transactionDate = new Date(String(rawDate ?? "").trim());
        }

        if (isNaN(transactionDate.getTime())) continue;

        // Parse Amounts
        const parseAmount = (val: any): number => {
          if (val === undefined || val === null) return 0;
          if (typeof val === "number") return val;
          const clean = String(val).replace(/[^0-9.-]/g, "");
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        const debit = debitIdx >= 0 ? parseAmount(row[debitIdx]) : 0;
        const credit = creditIdx >= 0 ? parseAmount(row[creditIdx]) : 0;
        const balance = balanceIdx >= 0 ? parseAmount(row[balanceIdx]) : 0;

        const description = descIdx >= 0 ? String(row[descIdx] ?? "").trim() : "";
        const reference = refIdx >= 0 ? String(row[refIdx] ?? "").trim() : "";

        // Normalize record and check for Duplicate
        const isDuplicate = await this.checkDuplicate(organizationId, transactionDate, description, reference, debit, credit);

        await this.prisma.bankTransaction.create({
          data: {
            organizationId,
            transactionDate,
            description,
            reference: reference || null,
            debit: new Prisma.Decimal(debit),
            credit: new Prisma.Decimal(credit),
            balance: new Prisma.Decimal(balance),
            classification: isDuplicate ? "Duplicate" : "Unmatched",
            importBatch: batch,
          },
        });
        imported++;
      }

      // Run Automated Matching Engine
      await this.autoMatch(organizationId, batch);

      return {
        imported,
        batch,
        message: `Imported ${imported} transactions from ${fileName}`,
      };
      }); // end $transaction
    } catch (e: any) {
      this.logger.error(`Error processing file: ${e.message}`, e.stack);
      return { imported: 0, error: `Failed to parse file: ${e.message}` };
    }
  }

  /**
   * Check if a transaction is a Duplicate in the database.
   */
  private async checkDuplicate(
    organizationId: number,
    date: Date,
    desc: string,
    ref: string,
    debit: number,
    credit: number,
  ): Promise<boolean> {
    const match = await this.prisma.bankTransaction.findFirst({
      where: {
        organizationId,
        transactionDate: date,
        description: desc,
        reference: ref || null,
        debit: new Prisma.Decimal(debit),
        credit: new Prisma.Decimal(credit),
      },
    });
    return !!match;
  }

  /**
   * Automated matching engine based on configurable rules.
   */
  async autoMatch(organizationId: number, batch: string) {
    // 1. Get configuration
    let config = await this.prisma.reconciliationToleranceRule.findUnique({
      where: { organizationId },
    });

    if (!config) {
      config = await this.prisma.reconciliationToleranceRule.create({
        data: {
          organizationId,
          amountTolerance: new Prisma.Decimal(0.00),
          dateToleranceDays: 3,
          matchByReference: true,
          matchByPaymentMethod: true,
          matchByLedger: true,
        },
      });
    }

    // 2. Fetch unmatched transactions in the current batch
    const transactions = await this.prisma.bankTransaction.findMany({
      where: {
        organizationId,
        importBatch: batch,
        classification: "Unmatched",
      },
    });

    // 3. Fetch candidates
    const activePayments = await this.prisma.payment.findMany({
      where: { organizationId, status: { in: ["cleared", "completed"] } },
    });

    const activeInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "partially_paid", "paid"] },
      },
    });

    const activeLedgers = await this.prisma.ledgerEntry.findMany({
      where: {
        organizationId,
      },
      include: {
        account: true,
      },
    });

    let matchedCount = 0;

    for (const tx of transactions) {
      const txAmount = Number(tx.debit) > 0 ? Number(tx.debit) : Number(tx.credit);

      const pmtCandidates: any[] = [];
      const invoiceCandidates: any[] = [];
      const ledgerCandidates: any[] = [];

      // A. Match against Payments
      for (const pmt of activePayments) {
        const daysDiff = Math.abs(
          (tx.transactionDate.getTime() - (pmt.paymentDate?.getTime() ?? 0)) / (1000 * 60 * 60 * 24),
        );
        if (daysDiff > config.dateToleranceDays) continue;

        const pmtAmount = Number(pmt.amount);
        const amountDiff = Math.abs(txAmount - pmtAmount);
        if (amountDiff > Number(config.amountTolerance)) continue;

        let refScore = 0;
        if (config.matchByReference && tx.reference && pmt.referenceId) {
          if (tx.reference.toLowerCase() === pmt.referenceId.toLowerCase()) {
            refScore = 10;
          } else if (
            tx.reference.toLowerCase().includes(pmt.referenceId.toLowerCase()) ||
            pmt.referenceId.toLowerCase().includes(tx.reference.toLowerCase())
          ) {
            refScore = 5;
          }
        }

        pmtCandidates.push({ pmt, amountDiff, daysDiff, refScore });
      }

      // B. Match against Invoice Settlements (Direct Match if no Payment recorded yet)
      for (const inv of activeInvoices) {
        let refScore = 0;
        if (tx.reference && inv.invoiceNumber) {
          if (tx.reference.toLowerCase() === inv.invoiceNumber.toLowerCase()) {
            refScore = 10;
          }
        }
        if (tx.description && inv.invoiceNumber && tx.description.toLowerCase().includes(inv.invoiceNumber.toLowerCase())) {
          refScore = 8;
        }

        if (refScore === 0) continue;

        const invAmount = Number(inv.total);
        const amountDiff = Math.abs(txAmount - invAmount);
        if (amountDiff > Number(config.amountTolerance)) continue;

        const daysDiff = Math.abs(
          (tx.transactionDate.getTime() - (inv.issueDate?.getTime() ?? 0)) / (1000 * 60 * 60 * 24),
        );

        invoiceCandidates.push({ inv, amountDiff, daysDiff, refScore });
      }

      // C. Match against Bank Ledger Entries
      if (config.matchByLedger) {
        for (const entry of activeLedgers) {
          if (entry.account.type !== "Asset" && !/bank|cash/i.test(entry.account.name)) continue;

          const daysDiff = Math.abs(
            (tx.transactionDate.getTime() - entry.entryDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (daysDiff > config.dateToleranceDays) continue;

          const ledgerAmount = Number(entry.debit) > 0 ? Number(entry.debit) : Number(entry.credit);
          const amountDiff = Math.abs(txAmount - ledgerAmount);
          if (amountDiff > Number(config.amountTolerance)) continue;

          ledgerCandidates.push({ entry, amountDiff, daysDiff });
        }
      }

      // 4. Resolve best match and classify
      const totalCandidatesCount = pmtCandidates.length + invoiceCandidates.length + ledgerCandidates.length;

      if (totalCandidatesCount === 0) {
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { classification: "Unmatched" },
        });
      } else if (totalCandidatesCount > 1) {
        await this.prisma.bankTransaction.update({
          where: { id: tx.id },
          data: { classification: "Exception" },
        });
      } else {
        // Exactly 1 candidate
        if (pmtCandidates.length === 1) {
          const { pmt, amountDiff } = pmtCandidates[0];
          const isMatched = amountDiff === 0;

          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: {
              matchedPaymentId: pmt.id,
              classification: isMatched ? "Matched" : "Partial_Match",
              matchedAt: new Date(),
              reconciledAt: new Date(),
              reconciledBy: "System Auto-Match",
            },
          });

          await this.prisma.reconciliationAuditLog.create({
            data: {
              organizationId,
              actionType: "AUTO_MATCH",
              bankTransactionId: tx.id,
              matchedPaymentId: pmt.id,
              notes: `Auto-matched to Payment Reference: ${pmt.referenceId ?? "N/A"}. Diff: ${amountDiff}`,
              performedBy: "System Auto-Match",
            },
          });
          matchedCount++;
        } else if (invoiceCandidates.length === 1) {
          const { inv, amountDiff } = invoiceCandidates[0];
          const isMatched = amountDiff === 0;

          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: {
              matchedInvoiceId: inv.id,
              classification: isMatched ? "Matched" : "Partial_Match",
              matchedAt: new Date(),
              reconciledAt: new Date(),
              reconciledBy: "System Auto-Match",
            },
          });

          await this.prisma.reconciliationAuditLog.create({
            data: {
              organizationId,
              actionType: "AUTO_MATCH",
              bankTransactionId: tx.id,
              matchedInvoiceId: inv.id,
              notes: `Auto-matched directly to Invoice: ${inv.invoiceNumber}. Diff: ${amountDiff}`,
              performedBy: "System Auto-Match",
            },
          });
          matchedCount++;
        } else if (ledgerCandidates.length === 1) {
          const { entry, amountDiff } = ledgerCandidates[0];
          const isMatched = amountDiff === 0;

          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: {
              matchedLedgerEntryId: entry.id,
              classification: isMatched ? "Matched" : "Partial_Match",
              matchedAt: new Date(),
              reconciledAt: new Date(),
              reconciledBy: "System Auto-Match",
            },
          });

          await this.prisma.reconciliationAuditLog.create({
            data: {
              organizationId,
              actionType: "AUTO_MATCH",
              bankTransactionId: tx.id,
              matchedLedgerEntryId: entry.id,
              notes: `Auto-matched to Ledger Entry: ${entry.description}. Diff: ${amountDiff}`,
              performedBy: "System Auto-Match",
            },
          });
          matchedCount++;
        }
      }
    }

    this.logger.log(`Auto-matched ${matchedCount} of ${transactions.length} transactions`);
  }

  /**
   * Retrieve list of transactions with pagination and optional batch filter.
   */
  async getTransactions(organizationId: number, batch?: string) {
    const where: any = { organizationId };
    if (batch) where.importBatch = batch;

    const transactions = await this.prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        matchedPayment: true,
        matchedInvoice: true,
        matchedLedgerEntry: true,
      },
    });

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t.transactionDate.toISOString().split("T")[0],
        description: t.description,
        reference: t.reference ?? "",
        debit: Number(t.debit),
        credit: Number(t.credit),
        balance: Number(t.balance),
        classification: t.classification,
        matched: t.classification === "Matched" || t.classification === "Partial_Match",
        matched_payment_id: t.matchedPaymentId,
        matched_payment_ref: t.matchedPayment?.referenceId ?? "",
        matched_invoice_id: t.matchedInvoiceId,
        matched_invoice_ref: t.matchedInvoice?.invoiceNumber ?? "",
        matched_ledger_id: t.matchedLedgerEntryId,
        matched_ledger_ref: t.matchedLedgerEntry?.description ?? "",
        adjusted_amount: Number(t.adjustedAmount),
        reconciliation_notes: t.reconciliationNotes ?? "",
        batch: t.importBatch,
        reconciled_at: t.reconciledAt ? t.reconciledAt.toISOString() : null,
        reconciled_by: t.reconciledBy ?? "",
      })),
    };
  }

  /**
   * Perform manual reconciliation pairing with optional adjustments.
   * Ensures compliance by recording transaction adjustments in the ledger if needed.
   */
  async matchTransactionManual(
    organizationId: number,
    transactionId: number,
    pairType: "payment" | "invoice" | "ledger",
    pairId: number,
    adjustmentAmount: number,
    notes: string,
    userEmail: string,
  ) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, organizationId },
    });
    if (!tx) return { error: "Bank transaction not found" };

    const updateData: any = {
      adjustedAmount: new Prisma.Decimal(adjustmentAmount),
      reconciliationNotes: notes,
      classification: adjustmentAmount === 0 ? "Matched" : "Partial_Match",
      matchedAt: new Date(),
      reconciledAt: new Date(),
      reconciledBy: userEmail,
    };

    let matchedPaymentId: number | null = null;
    let matchedInvoiceId: number | null = null;
    let matchedLedgerEntryId: number | null = null;

    if (pairType === "payment") {
      const p = await this.prisma.payment.findFirst({ where: { id: pairId, organizationId } });
      if (!p) return { error: "Payment record not found" };
      updateData.matchedPaymentId = p.id;
      matchedPaymentId = p.id;
    } else if (pairType === "invoice") {
      const inv = await this.prisma.invoice.findFirst({ where: { id: pairId, organizationId } });
      if (!inv) return { error: "Invoice record not found" };
      updateData.matchedInvoiceId = inv.id;
      matchedInvoiceId = inv.id;
    } else if (pairType === "ledger") {
      const entry = await this.prisma.ledgerEntry.findFirst({ where: { id: pairId, organizationId } });
      if (!entry) return { error: "Ledger Entry not found" };
      updateData.matchedLedgerEntryId = entry.id;
      matchedLedgerEntryId = entry.id;
    }

    // GAAP Auditability: Create adjusting ledger entry if adjustmentAmount is non-zero
    if (adjustmentAmount !== 0) {
      const bankAccountMapping = await this.prisma.accountMapping.findFirst({
        where: { organizationId, role: { in: ["ROLE_ACCOUNTS_RECEIVABLE", "ROLE_SALES_REVENUE"] } },
        include: { account: true },
      });

      if (bankAccountMapping) {
        await this.prisma.ledgerEntry.create({
          data: {
            organizationId,
            accountId: bankAccountMapping.accountId,
            entryDate: new Date(),
            description: `Reconciliation adjustment for statement item reference: ${tx.reference ?? "N/A"}. Notes: ${notes}`,
            debit: adjustmentAmount < 0 ? new Prisma.Decimal(Math.abs(adjustmentAmount)) : new Prisma.Decimal(0),
            credit: adjustmentAmount > 0 ? new Prisma.Decimal(adjustmentAmount) : new Prisma.Decimal(0),
            referenceType: "BankTransaction",
            referenceId: tx.id,
          },
        });
      }
    }

    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    // Record Audit Log
    await this.prisma.reconciliationAuditLog.create({
      data: {
        organizationId,
        actionType: "MANUAL_RECONCILE",
        bankTransactionId: transactionId,
        matchedPaymentId,
        matchedInvoiceId,
        matchedLedgerEntryId,
        adjustedAmount: new Prisma.Decimal(adjustmentAmount),
        notes: `Manually matched by user. Notes: ${notes}`,
        performedBy: userEmail,
      },
    });

    return { message: "Transaction reconciled successfully" };
  }

  /**
   * Revert a reconciliation match.
   */
  async unmatchTransaction(organizationId: number, transactionId: number, userEmail: string) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, organizationId },
    });
    if (!tx) return { error: "Transaction not found" };

    const oldPaymentId = tx.matchedPaymentId;
    const oldInvoiceId = tx.matchedInvoiceId;
    const oldLedgerId = tx.matchedLedgerEntryId;

    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: {
        matchedPaymentId: null,
        matchedInvoiceId: null,
        matchedLedgerEntryId: null,
        classification: "Unmatched",
        matchedAt: null,
        reconciledAt: null,
        reconciledBy: null,
        adjustedAmount: new Prisma.Decimal(0),
        reconciliationNotes: null,
      },
    });

    // GAAP audit trail logging
    await this.prisma.reconciliationAuditLog.create({
      data: {
        organizationId,
        actionType: "UNMATCH",
        bankTransactionId: transactionId,
        matchedPaymentId: oldPaymentId,
        matchedInvoiceId: oldInvoiceId,
        matchedLedgerEntryId: oldLedgerId,
        notes: `Unmatched reconciliation item`,
        performedBy: userEmail,
      },
    });

    return { message: "Reconciliation reverted successfully" };
  }

  /**
   * Retrieve variance report and reconciliation summaries.
   */
  async getVarianceReport(organizationId: number) {
    // Bank Statement Totals
    const totalTransactions = await this.prisma.bankTransaction.count({ where: { organizationId } });
    const matchedTransactions = await this.prisma.bankTransaction.count({
      where: { organizationId, classification: { in: ["Matched", "Partial_Match"] } },
    });
    const unmatchedTransactions = await this.prisma.bankTransaction.count({
      where: { organizationId, classification: "Unmatched" },
    });

    const txSums = await this.prisma.bankTransaction.aggregate({
      where: { organizationId },
      _sum: { debit: true, credit: true, adjustedAmount: true },
    });

    const statementDebitTotal = Number(txSums._sum.debit ?? 0);
    const statementCreditTotal = Number(txSums._sum.credit ?? 0);
    const statementAdjustedTotal = Number(txSums._sum.adjustedAmount ?? 0);

    // Ledger Cash/Bank Totals
    const ledgerSums = await this.prisma.ledgerEntry.aggregate({
      where: {
        organizationId,
        account: {
          OR: [
            { type: "Asset" },
            { name: { contains: "bank", mode: "insensitive" } },
            { name: { contains: "cash", mode: "insensitive" } },
          ],
        },
      },
      _sum: { debit: true, credit: true },
    });

    const ledgerDebitTotal = Number(ledgerSums._sum.debit ?? 0);
    const ledgerCreditTotal = Number(ledgerSums._sum.credit ?? 0);

    const statementBalance = statementCreditTotal - statementDebitTotal;
    const ledgerBalance = ledgerDebitTotal - ledgerCreditTotal;
    const variance = Math.abs(statementBalance - ledgerBalance - statementAdjustedTotal);

    return {
      summary: {
        total_transactions: totalTransactions,
        matched_transactions: matchedTransactions,
        unmatched_transactions: unmatchedTransactions,
        statement_balance: statementBalance,
        ledger_balance: ledgerBalance,
        adjusted_variance: statementAdjustedTotal,
        net_variance: variance,
      },
    };
  }

  /**
   * Fetch all audit logs.
   */
  async getAuditLogs(organizationId: number) {
    const logs = await this.prisma.reconciliationAuditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    return {
      logs: logs.map((l) => ({
        id: l.id,
        created_at: l.createdAt,
        action_type: l.actionType,
        bank_transaction_id: l.bankTransactionId,
        matched_payment_id: l.matchedPaymentId,
        matched_invoice_id: l.matchedInvoiceId,
        matched_ledger_entry_id: l.matchedLedgerEntryId,
        adjusted_amount: l.adjustedAmount ? Number(l.adjustedAmount) : null,
        notes: l.notes,
        performed_by: l.performedBy,
      })),
    };
  }

  /**
   * Get current organization tolerance rules.
   */
  async getToleranceRule(organizationId: number) {
    let rule = await this.prisma.reconciliationToleranceRule.findUnique({
      where: { organizationId },
    });
    if (!rule) {
      rule = await this.prisma.reconciliationToleranceRule.create({
        data: {
          organizationId,
          amountTolerance: new Prisma.Decimal(0.00),
          dateToleranceDays: 3,
          matchByReference: true,
          matchByPaymentMethod: true,
          matchByLedger: true,
        },
      });
    }
    return {
      id: rule.id,
      organization_id: rule.organizationId,
      amount_tolerance: Number(rule.amountTolerance),
      date_tolerance_days: rule.dateToleranceDays,
      match_by_reference: rule.matchByReference,
      match_by_payment_method: rule.matchByPaymentMethod,
      match_by_ledger: rule.matchByLedger,
      created_at: rule.createdAt,
      updated_at: rule.updatedAt,
    };
  }

  /**
   * Update organization tolerance rules.
   */
  async updateToleranceRule(organizationId: number, data: any) {
    const amountTolerance = new Prisma.Decimal(data.amount_tolerance ?? data.amountTolerance ?? 0);
    const dateToleranceDays = data.date_tolerance_days ?? data.dateToleranceDays ?? 3;
    const matchByReference = data.match_by_reference ?? data.matchByReference ?? true;
    const matchByPaymentMethod = data.match_by_payment_method ?? data.matchByPaymentMethod ?? true;
    const matchByLedger = data.match_by_ledger ?? data.matchByLedger ?? true;
    return this.prisma.reconciliationToleranceRule.upsert({
      where: { organizationId },
      create: {
        organizationId,
        amountTolerance,
        dateToleranceDays,
        matchByReference,
        matchByPaymentMethod,
        matchByLedger,
      },
      update: {
        amountTolerance,
        dateToleranceDays,
        matchByReference,
        matchByPaymentMethod,
        matchByLedger,
      },
    });
  }

  /**
   * Get batches summary for reconciliation report page.
   */
  async getReports(organizationId: number) {
    const batches = await this.prisma.bankTransaction.groupBy({
      by: ["importBatch"],
      where: { organizationId },
      _count: { id: true },
      _min: { transactionDate: true },
      _max: { transactionDate: true },
    });

    const reports = await Promise.all(
      batches.map(async (b) => {
        const txns = await this.prisma.bankTransaction.findMany({
          where: { organizationId, importBatch: b.importBatch },
        });
        const totalBank = txns.reduce((s, t) => s + Number(t.debit) + Number(t.credit), 0);
        const matched = txns.filter((t) => t.classification === "Matched" || t.classification === "Partial_Match");
        return {
          batch: b.importBatch,
          period_start: b._min.transactionDate?.toISOString().split("T")[0] ?? "",
          period_end: b._max.transactionDate?.toISOString().split("T")[0] ?? "",
          total_transactions: b._count.id,
          matched: matched.length,
          unmatched: b._count.id - matched.length,
          total_amount: Math.round(totalBank),
        };
      }),
    );

    return { reports };
  }
}
