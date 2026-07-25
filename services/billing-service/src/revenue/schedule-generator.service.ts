import { Injectable, Logger } from "@nestjs/common";
import type {
  GenerateScheduleForPobInput,
  GeneratedScheduleOutput,
  ScheduleItemOutput,
} from "./dto/schedule-generator.dto";
import { makeIdempotencyKey } from "./dto/schedule-generator.dto";

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name);

  generateSchedule(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number = 1,
  ): GeneratedScheduleOutput {
    const { recognitionMethod } = input;

    switch (recognitionMethod) {
      case "STRAIGHT_LINE":
        return this.generateStraightLine(organizationId, input, version);
      case "MILESTONE":
        return this.generateMilestone(organizationId, input, version);
      case "USAGE":
        return this.generateUsage(organizationId, input, version);
      case "MANUAL":
        return this.generateManual(organizationId, input, version);
      case "HYBRID":
        return this.generateHybrid(organizationId, input, version);
      default:
        throw new Error(`Unsupported recognition method: ${recognitionMethod}`);
    }
  }

  private generateStraightLine(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number,
  ): GeneratedScheduleOutput {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    const frequency = input.frequency ?? "monthly";
    const items: ScheduleItemOutput[] = [];

    if (frequency === "daily") {
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
      if (totalDays <= 0) throw new Error("End date must be after start date");

      const dailyAmount = input.allocatedAmount / totalDays;

      for (let i = 0; i < totalDays; i++) {
        const dayStart = new Date(start);
        dayStart.setDate(dayStart.getDate() + i);
        const dayEnd = new Date(dayStart);

        items.push(this.makeItem(
          organizationId,
          input.performanceObligationId,
          version,
          dayStart,
          dayEnd,
          i + 1 < totalDays ? new Date(dayEnd.getTime() + 86400000) : null,
          dailyAmount,
          "Contract.Activated",
        ));
      }
    } else {
      const monthlyPeriods = this.computeMonthlyPeriods(start, end);
      if (monthlyPeriods.length === 0) throw new Error("No months between start and end date");

      const totalAmount = input.allocatedAmount;
      const perPeriodAmount = totalAmount / monthlyPeriods.length;

      for (let i = 0; i < monthlyPeriods.length; i++) {
        const { periodStart, periodEnd } = monthlyPeriods[i];
        const nextRecognitionDate = i + 1 < monthlyPeriods.length
          ? monthlyPeriods[i + 1].periodStart
          : null;

        items.push(this.makeItem(
          organizationId,
          input.performanceObligationId,
          version,
          periodStart,
          periodEnd,
          nextRecognitionDate,
          perPeriodAmount,
          "Contract.Activated",
        ));
      }
    }

    // Apply rounding adjustment to last item
    if (items.length > 0) {
      const totalScheduled = items.reduce((s, i) => s + i.amount, 0);
      const diff = Math.round((input.allocatedAmount - totalScheduled) * 100) / 100;
      if (Math.abs(diff) > 0.001) {
        items[items.length - 1].amount = Number(
          (items[items.length - 1].amount + diff).toFixed(2),
        );
      }
    }

    return {
      contractId: input.contractId,
      performanceObligationId: input.performanceObligationId,
      version,
      items,
    };
  }

  private generateMilestone(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number,
  ): GeneratedScheduleOutput {
    if (!input.milestones?.length) {
      throw new Error("Milestone recognition requires at least one milestone");
    }

    const totalMilestoneAmount = input.milestones.reduce((s, m) => s + m.amount, 0);
    const diff = Math.round((input.allocatedAmount - totalMilestoneAmount) * 100) / 100;
    if (Math.abs(diff) > 0.01) {
      this.logger.warn(
        `Milestone amounts (${totalMilestoneAmount}) differ from allocated amount (${input.allocatedAmount}) by ${diff}`,
      );
    }

    const items: ScheduleItemOutput[] = input.milestones.map((m, i) => {
      const targetDate = new Date(m.targetDate);
      const nextRecognitionDate = i + 1 < input.milestones!.length
        ? new Date(input.milestones![i + 1].targetDate)
        : null;

      return this.makeItem(
        organizationId,
        input.performanceObligationId,
        version,
        targetDate,
        targetDate,
        nextRecognitionDate,
        m.amount,
        "Contract.Activated",
      );
    });

    return {
      contractId: input.contractId,
      performanceObligationId: input.performanceObligationId,
      version,
      items,
    };
  }

  private generateUsage(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number,
  ): GeneratedScheduleOutput {
    if (!input.usageEstimates?.length) {
      throw new Error("Usage recognition requires at least one usage estimate");
    }

    const items: ScheduleItemOutput[] = input.usageEstimates.map((u, i) => {
      const periodStart = new Date(u.periodStart);
      const periodEnd = new Date(u.periodEnd);
      const amount = u.estimatedUnits * u.unitPrice;
      const nextRecognitionDate = i + 1 < input.usageEstimates!.length
        ? new Date(input.usageEstimates![i + 1].periodStart)
        : null;

      return this.makeItem(
        organizationId,
        input.performanceObligationId,
        version,
        periodStart,
        periodEnd,
        nextRecognitionDate,
        amount,
        "Contract.Activated",
      );
    });

    return {
      contractId: input.contractId,
      performanceObligationId: input.performanceObligationId,
      version,
      items,
    };
  }

  private generateManual(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number,
  ): GeneratedScheduleOutput {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    const item = this.makeItem(
      organizationId,
      input.performanceObligationId,
      version,
      start,
      end,
      null,
      input.allocatedAmount,
      "Contract.Activated",
    );

    return {
      contractId: input.contractId,
      performanceObligationId: input.performanceObligationId,
      version,
      items: [item],
    };
  }

  private generateHybrid(
    organizationId: number,
    input: GenerateScheduleForPobInput,
    version: number,
  ): GeneratedScheduleOutput {
    if (!input.milestones?.length) {
      return this.generateStraightLine(organizationId, input, version);
    }

    const milestoneTotal = input.milestones.reduce((s, m) => s + m.amount, 0);
    const straightLineAmount = input.allocatedAmount - milestoneTotal;

    if (straightLineAmount < 0) {
      throw new Error("Milestone amounts exceed total allocated amount");
    }

    const straightLineInput: GenerateScheduleForPobInput = {
      ...input,
      allocatedAmount: straightLineAmount,
      milestones: undefined,
      usageEstimates: undefined,
    };

    const milestoneInput: GenerateScheduleForPobInput = {
      ...input,
      allocatedAmount: milestoneTotal,
      milestones: input.milestones,
      usageEstimates: undefined,
    };

    const slResult = this.generateStraightLine(organizationId, straightLineInput, version);
    const msResult = this.generateMilestone(organizationId, milestoneInput, version);

    return {
      contractId: input.contractId,
      performanceObligationId: input.performanceObligationId,
      version,
      items: [...slResult.items, ...msResult.items].sort(
        (a, b) => a.recognitionDate.getTime() - b.recognitionDate.getTime(),
      ),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────

  private computeMonthlyPeriods(start: Date, end: Date): Array<{ periodStart: Date; periodEnd: Date }> {
    const periods: Array<{ periodStart: Date; periodEnd: Date }> = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end) {
      const periodStart = new Date(Math.max(cursor.getTime(), start.getTime()));
      const periodEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      periods.push({
        periodStart: new Date(periodStart),
        periodEnd: new Date(Math.min(periodEnd.getTime(), end.getTime())),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return periods;
  }

  private makeItem(
    organizationId: number,
    pobId: number,
    version: number,
    periodStart: Date,
    periodEnd: Date,
    nextRecognitionDate: Date | null,
    amount: number,
    sourceEventType: string,
  ): ScheduleItemOutput {
    const roundedAmount = Number(amount.toFixed(2));

    return {
      periodStartDate: periodStart,
      periodEndDate: periodEnd,
      recognitionDate: periodEnd,
      nextRecognitionDate,
      amount: roundedAmount,
      idempotencyKey: makeIdempotencyKey(
        organizationId,
        pobId,
        version,
        periodStart.toISOString(),
        periodEnd.toISOString(),
      ),
      sourceEventType,
    };
  }
}
