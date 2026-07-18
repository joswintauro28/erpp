import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MonthEndCloseService {
  private readonly logger = new Logger(MonthEndCloseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPeriods(organizationId: number) {
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { organizationId },
      orderBy: { startDate: "desc" },
    });

    return {
      periods: periods.map((p) => ({
        id: p.id,
        label: p.label,
        start_date: p.startDate.toISOString().split("T")[0],
        end_date: p.endDate.toISOString().split("T")[0],
        is_closed: p.isClosed,
        closed_at: p.closedAt?.toISOString().split("T")[0] ?? null,
      })),
    };
  }

  async closePeriod(organizationId: number, periodId: number, userId: number) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");
    if (period.isClosed) throw new BadRequestException("Period is already closed");

    const now = new Date();
    if (now < period.endDate) {
      throw new BadRequestException("Cannot close a period before its end date");
    }

    await this.prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: {
        isClosed: true,
        closedAt: now,
        closedBy: userId,
      },
    });

    this.logger.log(`Period "${period.label}" closed by user ${userId}`);
    return { message: `Period "${period.label}" closed successfully` };
  }

  async reopenPeriod(organizationId: number, periodId: number) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");
    if (!period.isClosed) throw new BadRequestException("Period is not closed");

    await this.prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: { isClosed: false, closedAt: null, closedBy: null },
    });

    this.logger.log(`Period "${period.label}" reopened`);
    return { message: `Period "${period.label}" reopened` };
  }

  async getCloseStatus(organizationId: number) {
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { organizationId },
      orderBy: { endDate: "desc" },
      take: 12,
    });

    const lastClosed = periods.find((p) => p.isClosed);
    const currentOpen = periods.find((p) => !p.isClosed);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return {
      current_month: currentMonth,
      last_closed_period: lastClosed?.label ?? null,
      current_open_period: currentOpen?.label ?? "No open period",
      total_closed: periods.filter((p) => p.isClosed).length,
      total_open: periods.filter((p) => !p.isClosed).length,
    };
  }
}
