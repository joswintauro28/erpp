import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { DashboardService } from "./dashboard.service";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("dashboard")
@UseGuards(AuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("billing")
  @Permissions("dashboard.view")
  async getBillingKpis(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getBillingKpis(user.user_id);
  }
}
