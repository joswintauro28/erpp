import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PaymentsModule } from "./payments/payments.module";
import { QuotationsModule } from "./quotations/quotations.module";
import { CreditNotesModule } from "./credit-notes/credit-notes.module";
import { DebitNotesModule } from "./debit-notes/debit-notes.module";
import { RecurringInvoicesModule } from "./recurring-invoices/recurring-invoices.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { AccountingModule } from "./accounting/accounting.module";
import { DunningModule } from "./dunning/dunning.module";
import { BankReconciliationModule } from "./bank-reconciliation/bank-reconciliation.module";
import { MonthEndCloseModule } from "./month-end-close/month-end-close.module";
import { InternalModule } from "./internal/internal.module";
import { EventBusModule } from "./event-bus/event-bus.module";
import { RevenueModule } from "./revenue/revenue.module";
import { AppController } from "./app.controller";
import { RmqModule } from "./common/rmq.module";
import { DocumentNumberModule } from "./common/document-number.module";
import { AuditModule } from "./common/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    RmqModule,
    PrismaModule,
    DocumentNumberModule,
    AuthModule,
    QuotationsModule,
    CreditNotesModule,
    DebitNotesModule,
    RecurringInvoicesModule,
    InvoicesModule,
    PaymentsModule,
    DashboardModule,
    AccountingModule,
    DunningModule,
    BankReconciliationModule,
    MonthEndCloseModule,
    InternalModule,
    EventBusModule,
    RevenueModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
