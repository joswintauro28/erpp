import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Canonical strict document number pattern: [PREFIX]-[YYYYMM]-[NNNN]
export const DOCUMENT_ID_RE = /^[A-Z]{2,4}-\d{6}-\d{4}$/;

@Injectable()
export class DocumentNumberService {
  constructor(private readonly prisma: PrismaService) {}

  private monthKey(date: Date = new Date()): string {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  // L1: Allowlist of safe table/column identifiers to prevent SQL injection
  private static readonly SAFE_TABLES = new Set([
    "invoices", "quotations", "credit_notes", "debit_notes",
  ]);
  private static readonly SAFE_COLUMNS = new Set([
    "invoice_number", "quote_number", "credit_note_number", "debit_note_number",
  ]);

  /**
   * Return the next `{prefix}-{YYYYMM}-{NNNN}` number for the given table/column.
   * The sequence is the max existing numeric suffix + 1, scoped to the organization,
   * so numbers are never reused after deletes.
   */
  async next(
    prefix: string,
    table: string,
    column: string,
    organizationId: number,
    date: Date = new Date(),
  ): Promise<string> {
    if (!DocumentNumberService.SAFE_TABLES.has(table)) {
      throw new Error(`Unsafe table name: ${table}`);
    }
    if (!DocumentNumberService.SAFE_COLUMNS.has(column)) {
      throw new Error(`Unsafe column name: ${column}`);
    }
    const month = this.monthKey(date);
    const like = `${prefix}-${month}-%`;
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT ${column} AS "ref" FROM ${table} WHERE organization_id = $1 AND ${column} LIKE $2`,
      organizationId,
      like,
    )) as Array<{ ref: string | null }>;

    let seq = 0;
    for (const row of rows) {
      const v = row?.ref;
      if (typeof v === "string" && v.startsWith(`${prefix}-${month}-`)) {
        const tail = v.slice(`${prefix}-${month}-`.length);
        if (/^\d+$/.test(tail)) seq = Math.max(seq, Number(tail));
      }
    }
    return `${prefix}-${month}-${String(seq + 1).padStart(4, "0")}`;
  }

  nextInvoice(organizationId: number, date?: Date) {
    return this.next("INV", "invoices", "invoice_number", organizationId, date);
  }

  nextQuotation(organizationId: number, date?: Date) {
    return this.next("QT", "quotations", "quote_number", organizationId, date);
  }

  nextCreditNote(organizationId: number, date?: Date) {
    return this.next("CN", "credit_notes", "credit_note_number", organizationId, date);
  }

  nextDebitNote(organizationId: number, date?: Date) {
    return this.next("DN", "debit_notes", "debit_note_number", organizationId, date);
  }
}
