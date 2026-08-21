import { Module } from "@nestjs/common";
import { MonthEndCloseController } from "./month-end-close.controller";
import { MonthEndCloseService } from "./month-end-close.service";

@Module({
  controllers: [MonthEndCloseController],
  providers: [MonthEndCloseService],
})
export class MonthEndCloseModule {}
