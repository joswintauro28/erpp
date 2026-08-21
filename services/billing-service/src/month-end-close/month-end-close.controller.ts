import { Controller, Get, Post, Param, Body, UseGuards, ParseIntPipe } from "@nestjs/common";
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

  @Get("periods/:id/checklist")
  @Permissions("invoices.view")
  async getChecklist(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getChecklist(user.organization_id, id);
  }

  @Post("periods/:id/close")
  @Permissions("invoices.edit")
  async closePeriod(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body?: { comments?: string },
  ) {
    const userId = typeof user.sub === "string" ? parseInt(user.sub, 10) || 0 : user.sub;
    return this.service.closePeriod(user.organization_id, id, userId, body?.comments);
  }

  @Post("periods/:id/sign-off")
  @Permissions("invoices.edit")
  async signOff(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: { role: string; comments?: string },
  ) {
    const userId = typeof user.sub === "string" ? parseInt(user.sub, 10) || 0 : user.sub;
    return this.service.signOffPeriod(user.organization_id, id, userId, body.role, body.comments);
  }

  @Post("periods/:id/reopen-request")
  @Permissions("invoices.edit")
  async submitReopenRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reason: string },
  ) {
    const userId = typeof user.sub === "string" ? parseInt(user.sub, 10) || 0 : user.sub;
    return this.service.submitReopenRequest(user.organization_id, id, userId, body.reason);
  }

  @Post("reopen-requests/:id/approve")
  @Permissions("invoices.edit")
  async approveReopenRequest(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body?: { comments?: string },
  ) {
    const userId = typeof user.sub === "string" ? parseInt(user.sub, 10) || 0 : user.sub;
    return this.service.approveReopenRequest(user.organization_id, id, userId, body?.comments);
  }

  @Get("periods/status")
  @Permissions("invoices.view")
  async getStatus(@CurrentUser() user: JwtPayload) {
    return this.service.getCloseStatus(user.organization_id);
  }
}
