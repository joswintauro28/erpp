import {
  Controller,
  Get,
  UseGuards,
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
}
