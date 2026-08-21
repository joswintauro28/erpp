import { Injectable } from "@nestjs/common";
import { InvoicesService } from "../invoices/invoices.service";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async getBillingKpis(organizationId: number) {
    const [totalRevenue, outstanding, overdue, totalAR, totalAP, paymentMetrics, summary, recent, revenueTrend] =
      await Promise.all([
        this.invoicesService.sumRevenue(organizationId),
        this.invoicesService.sumOutstanding(organizationId),
        this.invoicesService.sumOverdue(organizationId),
        this.invoicesService.sumByType(organizationId, "receivable"),
        this.invoicesService.sumByType(organizationId, "payable"),
        this.paymentsService.getMetrics(organizationId),
        this.invoicesService.getInvoiceSummary(organizationId),
        this.invoicesService.getRecentInvoices(organizationId),
        this.invoicesService.getRevenueTrend(organizationId),
      ]);

    return {
      totalRevenue,
      outstanding,
      overdue,
      totalAR,
      totalAP,
      paymentMetrics,
      summary,
      recentInvoices: recent,
      revenueTrend,
    };
  }
}
