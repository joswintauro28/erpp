import { Controller, Get, Post, Param, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { MonthEndCloseService } from "./month-end-close.service";
import type { JwtPayload } from "../auth/auth.guard";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class MonthEndCloseController {
  constructor(private readonly service: MonthEndCloseService) {}

  @Get("periods")
  @Permissions("invoices.view")
  async getPeriods(@CurrentUser() user: JwtPayload) {
    return this.service.getPeriods(user.organization_id);
  }

  @Post("periods/:id/close")
  @Permissions("invoices.edit")
  async closePeriod(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    const userId = typeof user.sub === "string" ? parseInt(user.sub, 10) || 0 : user.sub;
    return this.service.closePeriod(user.organization_id, id, userId);
  }

  @Post("periods/:id/reopen")
  @Permissions("invoices.edit")
  async reopenPeriod(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reopenPeriod(user.organization_id, id);
  }

  @Get("periods/status")
  @Permissions("invoices.view")
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getCloseStatus(user.organization_id);
  }
}
