import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { DunningService } from "./dunning.service";
import type { JwtPayload } from "../auth/auth.guard";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class DunningController {
  constructor(private readonly dunningService: DunningService) {}

  @Get("dunning")
  @Permissions("invoices.view")
  async getDunning(@CurrentUser() user: JwtPayload) {
    return this.dunningService.findAll(user.organization_id);
  }
}
