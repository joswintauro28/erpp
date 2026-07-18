import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class BankReconciliationService {
  private readonly logger = new Logger(BankReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importCsv(organizationId: number, csvText: string) {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      return { imported: 0, error: "CSV must have a header row and at least one data row" };
    }

    const header = this.parseCsvRow(lines[0]);
    const dateIdx = header.findIndex((h) => /date/i.test(h));
    const descIdx = header.findIndex((h) => /desc/i.test(h));
    const refIdx = header.findIndex((h) => /ref/i.test(h) || /id/i.test(h));
    const debitIdx = header.findIndex((h) => /debit|dr|withdrawal/i.test(h));
    const creditIdx = header.findIndex((h) => /credit|cr|deposit/i.test(h));
    const balanceIdx = header.findIndex((h) => /balance/i.test(h));

    if (dateIdx === -1 || (debitIdx === -1 && creditIdx === -1)) {
      return { imported: 0, error: "CSV must have at least Date and Debit/Credit columns" };
    }

    const batch = `BATCH-${Date.now()}`;
    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvRow(lines[i]);
      if (row.length < 2) continue;

      const transactionDate = new Date(row[dateIdx]?.trim());
      if (isNaN(transactionDate.getTime())) continue;

      const debit = debitIdx >= 0 ? parseFloat(row[debitIdx]?.replace(/[^0-9.-]/g, "") || "0") : 0;
      const credit = creditIdx >= 0 ? parseFloat(row[creditIdx]?.replace(/[^0-9.-]/g, "") || "0") : 0;
      const balance = balanceIdx >= 0 ? parseFloat(row[balanceIdx]?.replace(/[^0-9.-]/g, "") || "0") : 0;

      if (isNaN(debit)) continue;
      if (isNaN(credit)) continue;

      await this.prisma.bankTransaction.create({
        data: {
          organizationId,
          transactionDate,
          description: descIdx >= 0 ? (row[descIdx]?.trim() ?? "") : "",
          reference: refIdx >= 0 ? (row[refIdx]?.trim() ?? null) : null,
          debit: new Prisma.Decimal(debit),
          credit: new Prisma.Decimal(credit),
          balance: new Prisma.Decimal(balance),
          importBatch: batch,
        },
      });
      imported++;
    }

    await this.autoMatch(organizationId, batch);

    return {
      imported,
      batch,
      message: `Imported ${imported} transactions`,
    };
  }

  private async autoMatch(organizationId: number, batch: string) {
    const transactions = await this.prisma.bankTransaction.findMany({
      where: { organizationId, importBatch: batch, matchedPaymentId: null },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        status: "completed",
        paymentDate: { not: null },
      },
      select: { id: true, amount: true, paymentDate: true, referenceId: true },
    });

    let matched = 0;
    for (const tx of transactions) {
      for (const pmt of payments) {
        const txAmount = Number(tx.debit) > 0 ? Number(tx.debit) : Number(tx.credit);
        if (Math.abs(txAmount - Number(pmt.amount)) < 0.01) {
          await this.prisma.bankTransaction.update({
            where: { id: tx.id },
            data: { matchedPaymentId: pmt.id, matchedAt: new Date() },
          });
          matched++;
          break;
        }
      }
    }

    this.logger.log(`Auto-matched ${matched} of ${transactions.length} transactions`);
  }

  async getTransactions(organizationId: number, batch?: string) {
    const where: any = { organizationId };
    if (batch) where.importBatch = batch;

    const transactions = await this.prisma.bankTransaction.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      include: {
        matchedPayment: {
          select: { id: true, amount: true, paymentMethod: true, referenceId: true },
        },
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
        matched: t.matchedPaymentId !== null,
        matched_payment_id: t.matchedPaymentId,
        matched_payment_ref: t.matchedPayment?.referenceId ?? "",
        batch: t.importBatch,
      })),
    };
  }

  async matchTransaction(organizationId: number, transactionId: number, paymentId: number) {
    const tx = await this.prisma.bankTransaction.findFirst({
      where: { id: transactionId, organizationId },
    });
    if (!tx) return { error: "Transaction not found" };

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId },
    });
    if (!payment) return { error: "Payment not found" };

    await this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { matchedPaymentId: paymentId, matchedAt: new Date() },
    });

    return { message: "Transaction matched successfully" };
  }

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
        const matched = txns.filter((t) => t.matchedPaymentId);
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

  private parseCsvRow(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }
}
