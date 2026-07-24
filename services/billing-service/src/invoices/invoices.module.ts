import { Module } from "@nestjs/common";
import { InvoicesController } from "./invoices.controller";
import { InvoicesService } from "./invoices.service";
import { InventoryClientService } from "./inventory.client";

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, InventoryClientService],
  exports: [InvoicesService, InventoryClientService],
})
export class InvoicesModule {}

