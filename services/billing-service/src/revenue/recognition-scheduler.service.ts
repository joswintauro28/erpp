import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { LedgerPostingService } from "./ledger-posting.service";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";

export interface RecognitionResult {
  itemId: number;
  status: "recognized" | "skipped" | "failed";
  amount?: number;
  error?: string;
}

@Injectable()
export class RecognitionSchedulerService {
  private readonly logger = new Logger(RecognitionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerPosting: LedgerPostingService,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processDueRecognitions(): Promise<{ processed: number; succeeded: number; failed: number }> {
    this.logger.log("Starting scheduled revenue recognition scan");

    const dueItems = await this.prisma.revenueScheduleItem.findMany({
      where: {
        status: "Scheduled",
        recognitionDate: { lte: new Date() },
      },
      include: {
        schedule: {
          include: {
            contract: { select: { contractNumber: true } },
            obligation: { select: { name: true, recognitionMethod: true } },
          },
        },
      },
      orderBy: { recognitionDate: "asc" },
      take: 200,
    });

    if (dueItems.length === 0) {
      this.logger.log("No due recognition items found");
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.logger.log(`Processing ${dueItems.length} due recognition items`);

    const results: RecognitionResult[] = [];
    for (const item of dueItems) {
      try {
        const result = await this.recognizeItem(item.id);
        results.push(result);
      } catch (err: any) {
        this.logger.error(`Failed to process item ${item.id}: ${err.message}`, err.stack);
        results.push({ itemId: item.id, status: "failed", error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.status === "recognized").length;
    const failed = results.filter((r) => r.status === "failed").length;

    this.logger.log(
      `Scheduled scan complete: ${results.length} processed, ${succeeded} succeeded, ${failed} failed`,
    );

    return { processed: results.length, succeeded, failed };
  }

  async recognizeItem(itemId: number): Promise<RecognitionResult> {
    const item = await this.prisma.revenueScheduleItem.findUnique({
      where: { id: itemId },
      include: {
        schedule: {
          include: {
            contract: true,
            obligation: true,
          },
        },
      },
    });

    if (!item) return { itemId, status: "failed", error: "Schedule item not found" };
    if (item.status !== "Scheduled") {
      return { itemId, status: "skipped", error: `Status is ${item.status}, not Scheduled` };
    }

    const pob = item.schedule.obligation;
    const contract = item.schedule.contract;

    if (pob.prerequisiteObligationId) {
      const prereq = await this.prisma.performanceObligation.findUnique({
        where: { id: pob.prerequisiteObligationId },
        select: { status: true },
      });
      if (prereq && prereq.status !== "Satisfied") {
        return {
          itemId,
          status: "skipped",
          error: `Prerequisite POB ${pob.prerequisiteObligationId} not yet satisfied`,
        };
      }
    }

    const amount = Number(item.amount);
    const now = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        const locked = await tx.revenueScheduleItem.findUnique({
          where: { id: itemId },
          select: { status: true },
        });
        if (locked?.status !== "Scheduled") {
          throw new Error(`Item ${itemId} was modified by another process (status: ${locked?.status})`);
        }

        const posting = await this.ledgerPosting.postRevenueRecognition({
          organizationId: contract.organizationId,
          scheduleItemId: itemId,
          amount,
          recognitionDate: item.recognitionDate,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          performanceObligationId: pob.id,
          pobName: pob.name,
          recognitionMethod: pob.recognitionMethod,
        });

        await tx.revenueScheduleItem.update({
          where: { id: itemId },
          data: {
            status: "Recognized",
            postedAt: now,
            ledgerEntryId: posting.debitEntryId,
          },
        });

        const currentDeferred = Number(pob.deferredBalance);
        const currentRecognized = Number(pob.recognizedBalance);
        const newRecognized = currentRecognized + amount;
        const totalAllocated = Number(pob.allocatedAmount);

        await tx.performanceObligation.update({
          where: { id: pob.id },
          data: {
            deferredBalance: { decrement: new Prisma.Decimal(amount) },
            recognizedBalance: { increment: new Prisma.Decimal(amount) },
            ...(newRecognized >= totalAllocated ? { status: "Satisfied" } : {}),
          },
        });

        await tx.revenueAuditLog.create({
          data: {
            organizationId: contract.organizationId,
            scheduleId: item.scheduleId,
            action: "REVENUE_RECOGNIZED",
            details: `Recognized ${amount} on item ${itemId} for POB ${pob.id} (${pob.name})`,
          },
        });

        await tx.outboxRecord.create({
          data: {
            organizationId: contract.organizationId,
            eventId: `rev-rec-${item.id}-${now.getTime()}`,
            eventType: Events.RevenueRecognized,
            payload: {
              contractId: contract.id,
              contractNumber: contract.contractNumber,
              performanceObligationId: pob.id,
              scheduleItemId: itemId,
              amount,
              recognitionMethod: pob.recognitionMethod,
              timestamp: now.toISOString(),
            },
            schemaVersion: "1.0",
          },
        });
      });
    } catch (err: any) {
      await this.prisma.revenueScheduleItem.update({
        where: { id: itemId },
        data: { status: "Failed", failureReason: err.message },
      }).catch((e) => this.logger.error(`Failed to mark item ${itemId} as Failed: ${e.message}`));

      return { itemId, status: "failed", error: err.message };
    }

    this.eventBus.emit(Events.RevenueRecognized, {
      organizationId: contract.organizationId,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      performanceObligationId: pob.id,
      scheduleItemId: itemId,
      amount,
      recognitionMethod: pob.recognitionMethod,
      timestamp: new Date(),
    });

    return { itemId, status: "recognized", amount };
  }

  async getRecognitionQueueStats(organizationId?: number) {
    const where: any = { status: "Scheduled" };
    if (organizationId) where.organizationId = organizationId;

    const [scheduled, recognized, failed, overdue] = await Promise.all([
      this.prisma.revenueScheduleItem.count({ where }),
      this.prisma.revenueScheduleItem.count({
        where: { ...where, status: "Recognized" },
      }),
      this.prisma.revenueScheduleItem.count({
        where: { ...where, status: "Failed" },
      }),
      this.prisma.revenueScheduleItem.count({
        where: {
          ...where,
          recognitionDate: { lte: new Date() },
        },
      }),
    ]);

    return { scheduled, recognized, failed, overdue };
  }
}
