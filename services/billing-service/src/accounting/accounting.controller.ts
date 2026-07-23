import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AccountingService } from "./accounting.service";
import { AgingQueryDto } from "./dto/aging-query.dto";
import type { JwtPayload } from "../auth/auth.guard";
import type { Response } from "express";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("accounts")
  @Permissions("invoices.view")
  async getAccounts(@CurrentUser() user: JwtPayload) {
    return this.accountingService.getAccounts(user.organization_id);
  }

  @Get("expenses")
  @Permissions("invoices.view")
  async getExpenses(@CurrentUser() user: JwtPayload) {
    return this.accountingService.getExpenses(user.organization_id);
  }

  @Get("ledger")
  @Permissions("invoices.view")
  async getLedger(@CurrentUser() user: JwtPayload) {
    return this.accountingService.getLedger(user.organization_id);
  }

  @Get("reports")
  @Permissions("invoices.view")
  async getReports(@CurrentUser() user: JwtPayload) {
    return this.accountingService.getReports(user.organization_id);
  }

  @Get("aging/summary")
  @Permissions("invoices.view")
  async getAgingSummary(
    @Query() query: AgingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getAgingSummary(user.organization_id, query);
  }

  @Get("aging/customers")
  @Permissions("invoices.view")
  async getAgingCustomers(
    @Query() query: AgingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getAgingCustomers(user.organization_id, query);
  }

  @Get("aging/invoices")
  @Permissions("invoices.view")
  async getAgingInvoices(
    @Query() query: AgingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getAgingInvoices(user.organization_id, query);
  }

  @Get("aging/reconciliation")
  @Permissions("invoices.view")
  async getAgingReconciliation(
    @Query() query: AgingQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getAgingReconciliation(user.organization_id, query);
  }

  @Get("aging/invoice/:id")
  @Permissions("invoices.view")
  async getInvoiceDrilldownTimeline(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getInvoiceDrilldownTimeline(user.organization_id, id);
  }

  @Get("aging/export")
  @Permissions("invoices.view")
  async exportAgingReport(
    @Query() query: AgingQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csvContent = await this.accountingService.exportAgingReport(user.organization_id, query);
    const filename = `AR_Aging_${query.view || "summary"}_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  }

  @Get("aging")
  @Permissions("invoices.view")
  async getAging(@CurrentUser() user: JwtPayload) {
    return this.accountingService.getAging(user.organization_id);
  }

  @Post("ledger")
  @Permissions("invoices.create")
  async createLedgerEntry(
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.createLedgerEntry(user.organization_id, body);
  }

  @Get("ledger/customer/:clientId")
  @Permissions("invoices.view")
  async getCustomerLedger(
    @Param("clientId", ParseIntPipe) clientId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.getCustomerLedger(user.organization_id, clientId);
  }

  @Post("accounts")
  @Permissions("invoices.create")
  async createAccount(
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.createAccount(user.organization_id, body);
  }

  @Put("accounts/:id")
  @Permissions("invoices.edit")
  async updateAccount(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.updateAccount(id, user.organization_id, body);
  }

  @Post("expenses")
  @Permissions("invoices.create")
  async createExpense(
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.createExpense(user.organization_id, body);
  }

  @Delete("expenses/:id")
  @Permissions("invoices.delete")
  async deleteExpense(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.accountingService.deleteExpense(id, user.organization_id);
  }

  @Post("expenses/from-po")
  @Permissions("invoices.create")
  async createExpenseFromPo(
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.accountingService.createExpenseFromPo(user.organization_id, body);
  }
}
