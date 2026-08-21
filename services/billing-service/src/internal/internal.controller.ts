import { Controller, Post, Body, Logger, UseGuards } from "@nestjs/common";
import { InternalService } from "./internal.service";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("internal/billing")
@UseGuards(AuthGuard, PermissionsGuard)
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(private readonly internalService: InternalService) {}

  @Post("trigger-sales-invoice")
  @Permissions("invoices.create")
  async triggerSalesInvoice(@Body() body: any, @CurrentUser() user: JwtPayload) {
    this.logger.log("Internal webhook: trigger-sales-invoice received");
    // Organization is taken from the authenticated JWT, never trusted from the body.
    return this.internalService.createSalesInvoice({ ...body, organizationId: user.organization_id });
  }

  @Post("trigger-vendor-bill")
  @Permissions("invoices.create")
  async triggerVendorBill(@Body() body: any, @CurrentUser() user: JwtPayload) {
    this.logger.log("Internal webhook: trigger-vendor-bill received");
    return this.internalService.createVendorBill({ ...body, organizationId: user.organization_id });
  }
}
