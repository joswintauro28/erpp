import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RevenueController } from "./revenue.controller";
import { RevenueService } from "./revenue.service";
import { SspCatalogService } from "./ssp-catalog.service";
import { SspAllocationService } from "./ssp-allocation.service";
import { ScheduleGeneratorService } from "./schedule-generator.service";
import { RecognitionSchedulerService } from "./recognition-scheduler.service";
import { LedgerPostingService } from "./ledger-posting.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RevenueController],
  providers: [
    RevenueService,
    SspCatalogService,
    SspAllocationService,
    ScheduleGeneratorService,
    RecognitionSchedulerService,
    LedgerPostingService,
  ],
  exports: [
    RevenueService,
    SspCatalogService,
    SspAllocationService,
    ScheduleGeneratorService,
    RecognitionSchedulerService,
    LedgerPostingService,
  ],
})
export class RevenueModule {}
