import { Module } from "@nestjs/common";
import { DebitNotesController } from "./debit-notes.controller";
import { DebitNotesService } from "./debit-notes.service";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [AccountingModule],
  controllers: [DebitNotesController],
  providers: [DebitNotesService],
  exports: [DebitNotesService],
})
export class DebitNotesModule {}

