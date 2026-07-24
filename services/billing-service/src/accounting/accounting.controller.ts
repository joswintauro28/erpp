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

import { CogsReportsService } from "./cogs-reports.service";
import { CogsAccountingService } from "./cogs-accounting.service";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly cogsReportsService: CogsReportsService,
    private readonly cogsAccountingService: CogsAccountingService,
  ) {}


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

  // ─── COGS & PROFITABILITY ENDPOINTS ──────────────────────────────

  @Get("reports/cogs/summary")
  @Permissions("invoices.view")
  async getCogsSummary(
    @Query() query: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getSummary(user.organization_id, query);
  }

  @Get("reports/cogs/invoices")
  @Permissions("invoices.view")
  async getInvoiceCogsReport(
    @Query() query: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getInvoiceCogsReport(user.organization_id, query);
  }

  @Get("reports/cogs/products")
  @Permissions("invoices.view")
  async getProductCogsReport(
    @Query() query: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getProductCogsReport(user.organization_id, query);
  }

  @Get("reports/cogs/ledger")
  @Permissions("invoices.view")
  async getCogsLedger(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getCogsLedger(user.organization_id);
  }

  @Get("reports/cogs/invoice/:id")
  @Permissions("invoices.view")
  async getInvoiceCogsDrilldown(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getInvoiceCogsDrilldown(user.organization_id, id);
  }

  @Get("reports/cogs/dlq")
  @Permissions("invoices.view")
  async getDlqRecords(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsReportsService.getDlqRecords(user.organization_id);
  }

  @Post("reports/cogs/posting")
  @Permissions("invoices.create")
  async processCogsPosting(
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    const idempotencyKey = body.idempotency_key || `post-${user.organization_id}-${Date.now()}`;
    return this.cogsAccountingService.processShipmentDispatched(
      user.organization_id,
      idempotencyKey,
      {
        shipmentReference: body.shipment_reference || `SHIP-${Date.now()}`,
        invoiceId: body.invoice_id,
        warehouseId: body.warehouse_id,
        items: body.items || [],
        performedBy: user.email || `user:${user.sub}`,
      },
    );
  }

  @Post("reports/cogs/posting/:id/reverse")
  @Permissions("invoices.edit")
  async reverseCogsPosting(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsAccountingService.reverseCogsPosting(
      user.organization_id,
      id,
      body.reason || "Manual Reversal Request",
      user.email || `user:${user.sub}`,
    );
  }

  @Get("reports/cogs/posting/:id/verify")
  @Permissions("invoices.view")
  async verifyCogsPosting(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cogsAccountingService.verifyPostingIntegrity(user.organization_id, id);
  }
}

