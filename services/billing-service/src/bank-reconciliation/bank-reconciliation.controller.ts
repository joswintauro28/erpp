import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { BankReconciliationService } from "./bank-reconciliation.service";
import type { JwtPayload } from "../auth/auth.guard";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post("bank-reconciliation/import")
  @Permissions("invoices.create")
  async importCsv(@Body("csv") csv: string, @CurrentUser() user: JwtPayload) {
    return this.service.importCsv(user.organization_id, csv);
  }

  @Post("bank-reconciliation/import-file")
  @Permissions("invoices.create")
  async importFile(
    @Body("file") fileBase64: string,
    @Body("fileName") fileName: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.importFile(user.organization_id, fileBase64, fileName);
  }

  @Get("bank-reconciliation/transactions")
  @Permissions("invoices.view")
  async getTransactions(
    @Query("batch") batch: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getTransactions(user.organization_id, batch);
  }

  @Post("bank-reconciliation/match")
  @Permissions("invoices.edit")
  async matchTransaction(
    @Body() body: { transaction_id: number; payment_id: number },
    @CurrentUser() user: JwtPayload,
  ) {
    // Forward legacy matches as manual match with 0 adjustment
    return this.service.matchTransactionManual(
      user.organization_id,
      body.transaction_id,
      "payment",
      body.payment_id,
      0,
      "Manual match from legacy UI",
      user.email || "unknown@user.com",
    );
  }

  @Post("bank-reconciliation/reconcile-manual")
  @Permissions("invoices.edit")
  async reconcileManual(
    @Body()
    body: {
      transaction_id: number;
      pair_type: "payment" | "invoice" | "ledger";
      pair_id: number;
      adjustment_amount: number;
      notes: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.matchTransactionManual(
      user.organization_id,
      body.transaction_id,
      body.pair_type,
      body.pair_id,
      body.adjustment_amount ?? 0,
      body.notes ?? "",
      user.email || "unknown@user.com",
    );
  }

  @Post("bank-reconciliation/unmatch")
  @Permissions("invoices.edit")
  async unmatchTransaction(
    @Body("transaction_id") transactionId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.unmatchTransaction(user.organization_id, transactionId, user.email || "unknown@user.com");
  }

  @Get("bank-reconciliation/reports")
  @Permissions("invoices.view")
  async getReports(@CurrentUser() user: JwtPayload) {
    return this.service.getReports(user.organization_id);
  }

  @Get("bank-reconciliation/variance-report")
  @Permissions("invoices.view")
  async getVarianceReport(@CurrentUser() user: JwtPayload) {
    return this.service.getVarianceReport(user.organization_id);
  }

  @Get("bank-reconciliation/audit-logs")
  @Permissions("invoices.view")
  async getAuditLogs(@CurrentUser() user: JwtPayload) {
    return this.service.getAuditLogs(user.organization_id);
  }

  @Get("bank-reconciliation/config")
  @Permissions("invoices.view")
  async getToleranceRule(@CurrentUser() user: JwtPayload) {
    return this.service.getToleranceRule(user.organization_id);
  }

  @Post("bank-reconciliation/config")
  @Permissions("invoices.edit")
  async updateToleranceRule(
    @Body()
    body: {
      amountTolerance: number;
      dateToleranceDays: number;
      matchByReference: boolean;
      matchByPaymentMethod: boolean;
      matchByLedger: boolean;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateToleranceRule(user.organization_id, body);
  }
}
