import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { RecurringInvoicesController } from "./recurring-invoices.controller";
import { RecurringInvoicesService } from "./recurring-invoices.service";
import { RecurringSchedulerService } from "./recurring-scheduler.service";

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RecurringInvoicesController],
  providers: [RecurringInvoicesService, RecurringSchedulerService],
  exports: [RecurringInvoicesService],
})
export class RecurringInvoicesModule {}
