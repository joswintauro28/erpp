import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { SspCatalogService } from "./ssp-catalog.service";
import { SspAllocationService } from "./ssp-allocation.service";
import { ScheduleGeneratorService } from "./schedule-generator.service";
import type { ContractAllocationInput, SspAllocationResult } from "./dto/allocate-ssp.dto";
import type { GenerateScheduleForPobInput, GeneratedScheduleOutput } from "./dto/schedule-generator.dto";

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sspCatalogService: SspCatalogService,
    private readonly sspAllocationService: SspAllocationService,
    private readonly scheduleGenerator: ScheduleGeneratorService,
  ) {}

  async allocateAndCreateContract(
    organizationId: number,
    input: ContractAllocationInput,
  ): Promise<{ contractId: number; allocation: SspAllocationResult }> {
    const pobsWithSsp = await this.resolveSspValues(organizationId, input);

    const allocation = this.sspAllocationService.allocateTransactionPrice({
      externalContractId: input.externalContractId,
      transactionPrice: input.transactionPrice,
      variableConsiderations: input.variableConsiderations ?? [],
      performanceObligations: pobsWithSsp,
    });

    const contract = await this.prisma.$transaction(async (tx) => {
      const c = await tx.billingContract.create({
        data: {
          organizationId,
          externalContractId: input.externalContractId,
          contractNumber: input.contractNumber,
          clientId: input.clientId,
          clientName: input.clientName,
          status: "Active",
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          baseContractValue: new Prisma.Decimal(input.transactionPrice),
          variableValue: new Prisma.Decimal(allocation.variableConsiderationsTotal),
          totalAllocatedValue: new Prisma.Decimal(allocation.adjustedTransactionPrice),
          currency: "INR",
          exchangeRate: new Prisma.Decimal(1.0),
        },
      });

      for (const vc of input.variableConsiderations ?? []) {
        await tx.variableConsideration.create({
          data: {
            organizationId,
            contractId: c.id,
            type: vc.type,
            estimatedAmount: new Prisma.Decimal(vc.estimatedAmount),
            confidenceLevel: new Prisma.Decimal(vc.confidenceLevel ?? 1.0),
          },
        });
      }

      for (const pob of allocation.performanceObligations) {
        const matching = input.performanceObligations.find(
          (p) => p.externalObligationId === pob.externalObligationId,
        );
        const dbPob = await tx.performanceObligation.create({
          data: {
            organizationId,
            contractId: c.id,
            externalObligationId: pob.externalObligationId,
            obligationNumber: pob.obligationNumber,
            name: pob.name,
            productId: matching?.productId ?? null,
            productName: matching?.productName ?? null,
            transactionAmount: new Prisma.Decimal(pob.sspValue),
            allocatedAmount: new Prisma.Decimal(pob.allocatedAmount),
            deferredBalance: new Prisma.Decimal(pob.allocatedAmount),
            recognitionMethod: pob.recognitionMethod,
            recognitionTrigger: pob.recognitionTrigger,
          },
        });

        await this.generateAndPersistSchedule(
          tx,
          organizationId,
          c.id,
          dbPob.id,
          pob.allocatedAmount,
          new Date(input.startDate),
          new Date(input.endDate),
          pob.recognitionMethod,
          pob.recognitionTrigger,
          matching?.milestones,
          matching?.usageEstimates,
        );
      }

      return c;
    });

    this.logger.log(`Contract created with schedules: ${contract.contractNumber} (${contract.id})`);
    return { contractId: contract.id, allocation };
  }

  async generateScheduleForPob(
    organizationId: number,
    pobId: number,
    input: GenerateScheduleForPobInput,
  ): Promise<GeneratedScheduleOutput> {
    const pob = await this.prisma.performanceObligation.findFirst({
      where: { id: pobId, organizationId },
    });
    if (!pob) throw new NotFoundException("Performance obligation not found");

    const txResult = await this.prisma.$transaction(async (tx) => {
      const currentMaxVersion = await tx.revenueSchedule.findFirst({
        where: { performanceObligationId: pobId },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const newVersion = (currentMaxVersion?.version ?? 0) + 1;

      const schedule = await tx.revenueSchedule.create({
        data: {
          organizationId,
          contractId: pob.contractId,
          performanceObligationId: pobId,
          version: newVersion,
          isCurrent: true,
          status: "Active",
        },
      });

      await tx.revenueSchedule.updateMany({
        where: { performanceObligationId: pobId, isCurrent: true, id: { not: schedule.id } },
        data: { isCurrent: false, status: "Superseded" },
      });

      const generated = this.scheduleGenerator.generateSchedule(organizationId, input, newVersion);

      for (const item of generated.items) {
        await tx.revenueScheduleItem.create({
          data: {
            organizationId,
            scheduleId: schedule.id,
            periodStartDate: item.periodStartDate,
            periodEndDate: item.periodEndDate,
            recognitionDate: item.recognitionDate,
            nextRecognitionDate: item.nextRecognitionDate,
            amount: new Prisma.Decimal(item.amount),
            status: "Scheduled",
            idempotencyKey: item.idempotencyKey,
            sourceEventType: item.sourceEventType,
          },
        });
      }

      return { scheduleId: schedule.id, version: newVersion, items: generated.items };
    });

    return {
      contractId: input.contractId,
      performanceObligationId: pobId,
      version: txResult.version,
      items: txResult.items,
    };
  }

  async getContract(organizationId: number, contractId: number) {
    return this.prisma.billingContract.findFirst({
      where: { id: contractId, organizationId },
      include: {
        performanceObligations: true,
        variableConsiderations: true,
        revenueSchedules: {
          include: { items: { orderBy: { recognitionDate: "asc" } } },
        },
      },
    });
  }

  async getSchedulesForPob(organizationId: number, pobId: number) {
    return this.prisma.revenueSchedule.findMany({
      where: { performanceObligationId: pobId, organizationId },
      include: { items: { orderBy: { recognitionDate: "asc" } } },
      orderBy: { version: "desc" },
    });
  }

  private async generateAndPersistSchedule(
    tx: Prisma.TransactionClient,
    organizationId: number,
    contractId: number,
    pobId: number,
    allocatedAmount: number,
    startDate: Date,
    endDate: Date,
    recognitionMethod: string,
    recognitionTrigger: string,
    milestones?: Array<{ name: string; targetDate: string; amount: number }>,
    usageEstimates?: Array<{ name: string; periodStart: string; periodEnd: string; estimatedUnits: number; unitPrice: number }>,
  ) {
    const schedule = await tx.revenueSchedule.create({
      data: {
        organizationId,
        contractId,
        performanceObligationId: pobId,
        version: 1,
        isCurrent: true,
        status: "Active",
      },
    });

    const input: GenerateScheduleForPobInput = {
      contractId,
      performanceObligationId: pobId,
      allocatedAmount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      recognitionMethod: recognitionMethod as any,
      recognitionTrigger: recognitionTrigger as any,
      milestones,
      usageEstimates,
    };

    const generated = this.scheduleGenerator.generateSchedule(organizationId, input);

    for (const item of generated.items) {
      await tx.revenueScheduleItem.create({
        data: {
          organizationId,
          scheduleId: schedule.id,
          periodStartDate: item.periodStartDate,
          periodEndDate: item.periodEndDate,
          recognitionDate: item.recognitionDate,
          nextRecognitionDate: item.nextRecognitionDate,
          amount: new Prisma.Decimal(item.amount),
          idempotencyKey: item.idempotencyKey,
          sourceEventType: item.sourceEventType ?? "Contract.Activated",
        },
      });
    }

    await tx.revenueAuditLog.create({
      data: {
        organizationId,
        scheduleId: schedule.id,
        action: "SCHEDULE_CREATED",
        details: `Schedule v1 created for POB ${pobId} (${recognitionMethod}): ${generated.items.length} items, total ${allocatedAmount}`,
      },
    });
  }

  private async resolveSspValues(
    organizationId: number,
    input: ContractAllocationInput,
  ): Promise<Array<{
    externalObligationId: string;
    obligationNumber: string;
    name: string;
    productId?: number;
    productName?: string;
    sspValue: number;
    recognitionMethod: string;
    recognitionTrigger: string;
    milestones?: Array<{ name: string; targetDate: string; amount: number }>;
    usageEstimates?: Array<{ name: string; periodStart: string; periodEnd: string; estimatedUnits: number; unitPrice: number }>;
  }>> {
    const result: Array<any> = [];

    for (const pob of input.performanceObligations) {
      let sspValue = pob.sspValue;
      if (pob.productId) {
        const catalogEntry = await this.sspCatalogService.findActiveSsp(
          organizationId,
          pob.productId,
          new Date(input.startDate),
        );
        if (catalogEntry) {
          sspValue = catalogEntry.basePrice;
        }
      }
      result.push({
        externalObligationId: pob.externalObligationId,
        obligationNumber: pob.obligationNumber,
        name: pob.name,
        productId: pob.productId,
        productName: pob.productName,
        sspValue,
        recognitionMethod: pob.recognitionMethod,
        recognitionTrigger: pob.recognitionTrigger,
        milestones: (pob as any).milestones,
        usageEstimates: (pob as any).usageEstimates,
      });
    }

    return result;
  }
}
