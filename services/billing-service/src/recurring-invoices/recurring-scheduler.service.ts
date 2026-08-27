import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class RecurringSchedulerService {
  private readonly logger = new Logger(RecurringSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringInvoices() {
    this.logger.log("Checking recurring invoices...");

    const now = new Date();
    const templates = await this.prisma.recurringInvoice.findMany({
      where: {
        status: "active",
        nextRun: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    if (templates.length === 0) {
      this.logger.log("No recurring invoices due");
      return;
    }

    this.logger.log(`Found ${templates.length} recurring invoice(s) to generate`);

    for (const tmpl of templates) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const items = (tmpl.items as any[]) ?? [];
          const subtotal = items.reduce(
            (s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice),
            0,
          );

          // M7: default to intrastate (domestic) instead of fabricating based on clientId
          const gstTreatment = "intrastate" as const;
          const gstRate = 18;
          let cgst = 0, sgst = 0, igst = 0;
          if (gstTreatment === "intrastate") {
            cgst = subtotal * (gstRate / 2 / 100);
            sgst = subtotal * (gstRate / 2 / 100);
          } else {
            igst = subtotal * (gstRate / 100);
          }
          const taxTotal = cgst + sgst + igst;
          const total = subtotal + taxTotal;

          const invoice = await tx.invoice.create({
            data: {
              organizationId: tmpl.organizationId,
              clientId: tmpl.clientId,
              clientName: tmpl.clientName,
              status: "sent",
              issueDate: now,
              dueDate: new Date(now.getTime() + 30 * 86400000),
              subtotal: new Prisma.Decimal(subtotal),
              cgst: new Prisma.Decimal(cgst),
              sgst: new Prisma.Decimal(sgst),
              igst: new Prisma.Decimal(igst),
              taxTotal: new Prisma.Decimal(taxTotal),
              total: new Prisma.Decimal(total),
              paidAmount: 0,
              balanceDue: new Prisma.Decimal(total),
              gstTreatment,
              notes: `Auto-generated from recurring template: ${tmpl.templateName}`,
              items: {
                create: items.map((i: any) => ({
                  productId: i.productId ?? null,
                  description: i.description ?? "",
                  quantity: new Prisma.Decimal(i.quantity ?? 0),
                  unitPrice: new Prisma.Decimal(i.unitPrice ?? 0),
                  gstRate: new Prisma.Decimal(i.gstRate ?? 18),
                  amount: new Prisma.Decimal(Number(i.quantity) * Number(i.unitPrice)),
                })),
              },
            },
          });

          const nextRun = this.computeNextRun(tmpl.frequency, now);
          const status = tmpl.endDate && nextRun > tmpl.endDate ? "completed" : "active";

          await tx.recurringInvoice.update({
            where: { id: tmpl.id },
            data: {
              lastGenerated: now,
              nextRun,
              status,
            },
          });

          this.logger.log(`Generated invoice #${invoice.id} from recurring template "${tmpl.templateName}"`);
        });
      } catch (err) {
        this.logger.error(`Failed to generate recurring invoice for template "${tmpl.templateName}"`, err);
      }
    }
  }

  private computeNextRun(frequency: string, from: Date): Date {
    const d = new Date(from);
    switch (frequency) {
      case "weekly":   d.setDate(d.getDate() + 7); break;
      case "monthly":  d.setMonth(d.getMonth() + 1); break;
      case "quarterly": d.setMonth(d.getMonth() + 3); break;
      case "yearly":   d.setFullYear(d.getFullYear() + 1); break;
    }
    return d;
  }
}
