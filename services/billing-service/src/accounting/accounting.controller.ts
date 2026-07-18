import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AccountingService } from "./accounting.service";
import type { JwtPayload } from "../auth/auth.guard";

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
