import { Module } from "@nestjs/common";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";
import { CogsReportsService } from "./cogs-reports.service";
import { CogsAccountingService } from "./cogs-accounting.service";

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, CogsReportsService, CogsAccountingService],
  exports: [AccountingService, CogsReportsService, CogsAccountingService],
})
export class AccountingModule {}

