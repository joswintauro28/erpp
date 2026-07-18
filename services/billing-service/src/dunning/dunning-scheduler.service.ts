import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DunningSchedulerService {
  private readonly logger = new Logger(DunningSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processDunning() {
    this.logger.log("Checking for overdue invoices...");

    const now = new Date();

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ["sent", "partially_paid"] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        dueDate: true,
        balanceDue: true,
        status: true,
      },
    });

    if (overdueInvoices.length === 0) {
      this.logger.log("No newly overdue invoices found");
      return;
    }

    this.logger.log(`Processing ${overdueInvoices.length} overdue invoice(s)`);

    for (const inv of overdueInvoices) {
      try {
        const daysOverdue = Math.floor(
          (now.getTime() - inv.dueDate!.getTime()) / 86400000,
        );

        const lastRecord = await this.prisma.dunningRecord.findFirst({
          where: { invoiceId: inv.id },
          orderBy: { level: "desc" },
        });

        const currentLevel = lastRecord ? lastRecord.level : 0;
        let newLevel = currentLevel;

        if (daysOverdue >= 45 && currentLevel < 3) {
          newLevel = 3;
        } else if (daysOverdue >= 30 && currentLevel < 2) {
          newLevel = 2;
        } else if (daysOverdue >= 15 && currentLevel < 1) {
          newLevel = 1;
        }

        if (newLevel > currentLevel) {
          await this.prisma.dunningRecord.create({
            data: {
              organizationId: inv.id,
              invoiceId: inv.id,
              level: newLevel,
              daysOverdue,
              notes: `Auto-escalated to dunning level ${newLevel} (${daysOverdue} days overdue)`,
            },
          });

          this.logger.log(
            `Dunning level ${newLevel} for ${inv.invoiceNumber ?? `Invoice #${inv.id}`} (${daysOverdue} days overdue)`,
          );
        }

        if (inv.status !== "overdue") {
          await this.prisma.invoice.update({
            where: { id: inv.id },
            data: { status: "overdue" },
          });
        }
      } catch (err) {
        this.logger.error(`Dunning failed for invoice #${inv.id}`, err);
      }
    }
  }
}
