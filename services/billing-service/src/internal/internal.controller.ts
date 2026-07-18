import { Controller, Post, Body, Logger } from "@nestjs/common";
import { InternalService } from "./internal.service";

@Controller("internal/billing")
export class InternalController {
  private readonly logger = new Logger(InternalController.name);

  constructor(private readonly internalService: InternalService) {}

  @Post("trigger-sales-invoice")
  async triggerSalesInvoice(@Body() body: any) {
    this.logger.log("Internal webhook: trigger-sales-invoice received");
    return this.internalService.createSalesInvoice(body);
  }

  @Post("trigger-vendor-bill")
  async triggerVendorBill(@Body() body: any) {
    this.logger.log("Internal webhook: trigger-vendor-bill received");
    return this.internalService.createVendorBill(body);
  }
}
