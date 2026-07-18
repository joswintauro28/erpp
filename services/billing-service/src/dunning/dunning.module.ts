import { Module } from "@nestjs/common";
import { DunningController } from "./dunning.controller";
import { DunningService } from "./dunning.service";
import { DunningSchedulerService } from "./dunning-scheduler.service";

@Module({
  controllers: [DunningController],
  providers: [DunningService, DunningSchedulerService],
  exports: [DunningService],
})
export class DunningModule {}
