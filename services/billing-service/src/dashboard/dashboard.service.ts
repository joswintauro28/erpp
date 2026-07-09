import { Injectable } from "@nestjs/common";
import { InvoicesService } from "../invoices/invoices.service";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getBillingKpis(ownerId: number) {
    const [totalRevenue, outstanding, overdue, paymentMetrics, summary, recent, revenueTrend] =
      await Promise.all([
        this.invoicesService.sumRevenue(ownerId),
        this.invoicesService.sumOutstanding(ownerId),
        this.invoicesService.sumOverdue(ownerId),
        this.paymentsService.getMetrics(ownerId),
        this.invoicesService.getInvoiceSummary(ownerId),
        this.invoicesService.getRecentInvoices(ownerId),
        this.invoicesService.getRevenueTrend(ownerId),
      ]);

    return {
      totalRevenue,
      outstanding,
      overdue,
      paymentMetrics,
      summary,
      recentInvoices: recent,
      revenueTrend,
    };
  }
}
