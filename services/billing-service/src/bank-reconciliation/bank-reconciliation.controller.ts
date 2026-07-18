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
    return this.service.matchTransaction(user.organization_id, body.transaction_id, body.payment_id);
  }

  @Get("bank-reconciliation/reports")
  @Permissions("invoices.view")
  async getReports(@CurrentUser() user: JwtPayload) {
    return this.service.getReports(user.organization_id);
  }
}
