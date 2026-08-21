import { Module } from "@nestjs/common";
import { AccountingController } from "./accounting.controller";
import { AccountingService } from "./accounting.service";
import { CogsReportsService } from "./cogs-reports.service";
import { CogsAccountingService } from "./cogs-accounting.service";
import { FinancialReportingService } from "./financial-reporting.service";
import { PostingEngineService } from "./posting-engine.service";
import { PostingBatchService } from "./posting-batch.service";

@Module({
  controllers: [AccountingController],
  providers: [
    AccountingService,
    CogsReportsService,
    CogsAccountingService,
    FinancialReportingService,
    PostingEngineService,
    PostingBatchService,
  ],
  exports: [
    AccountingService,
    CogsReportsService,
    CogsAccountingService,
    FinancialReportingService,
    PostingEngineService,
    PostingBatchService,
  ],
})
export class AccountingModule {}


