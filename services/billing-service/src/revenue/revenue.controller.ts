import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/auth.guard";
import { RevenueService } from "./revenue.service";
import { SspCatalogService } from "./ssp-catalog.service";
import { SspAllocationService } from "./ssp-allocation.service";
import { ScheduleGeneratorService } from "./schedule-generator.service";
import { RecognitionSchedulerService } from "./recognition-scheduler.service";
import { LedgerPostingService } from "./ledger-posting.service";
import type { CreateSspCatalogEntryDto, UpdateSspCatalogEntryDto } from "./dto/ssp-catalog.dto";
import type { ContractAllocationInput } from "./dto/allocate-ssp.dto";
import type { GenerateScheduleForPobInput } from "./dto/schedule-generator.dto";

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class RevenueController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly sspCatalogService: SspCatalogService,
    private readonly sspAllocationService: SspAllocationService,
    private readonly scheduleGenerator: ScheduleGeneratorService,
    private readonly recognitionScheduler: RecognitionSchedulerService,
    private readonly ledgerPosting: LedgerPostingService,
  ) {}

  // ─── SSP Catalog ───────────────────────────────────────────

  @Get("ssp-catalog")
  @Permissions("invoices.view")
  async getSspCatalog(
    @Query("productId") productId: string | undefined,
    @Query("active") active: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sspCatalogService.findAll(
      user.organization_id,
      productId ? Number(productId) : undefined,
      active === "true",
    );
  }

  @Post("ssp-catalog")
  @Permissions("invoices.create")
  async createSspEntry(
    @Body() body: CreateSspCatalogEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sspCatalogService.create(user.organization_id, body);
  }

  @Put("ssp-catalog/:id")
  @Permissions("invoices.edit")
  async updateSspEntry(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateSspCatalogEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sspCatalogService.update(id, user.organization_id, body);
  }

  @Delete("ssp-catalog/:id")
  @Permissions("invoices.delete")
  async deleteSspEntry(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.sspCatalogService.remove(id, user.organization_id);
    return { message: "SSP entry deleted" };
  }

  // ─── SSP Allocation (stateless engine) ─────────────────────

  @Post("revenue/allocate")
  @Permissions("invoices.view")
  async allocate(
    @Body() body: ContractAllocationInput,
    @CurrentUser() user: JwtPayload,
  ) {
    body.organizationId = user.organization_id;
    return this.sspAllocationService.allocateTransactionPrice({
      externalContractId: body.externalContractId,
      transactionPrice: body.transactionPrice,
      variableConsiderations: body.variableConsiderations ?? [],
      performanceObligations: body.performanceObligations,
    });
  }

  // ─── Contracts (allocate + persist) ────────────────────────

  @Post("revenue/contracts")
  @Permissions("invoices.create")
  async createContract(
    @Body() body: ContractAllocationInput,
    @CurrentUser() user: JwtPayload,
  ) {
    body.organizationId = user.organization_id;
    return this.revenueService.allocateAndCreateContract(user.organization_id, body);
  }

  @Get("revenue/contracts/:id")
  @Permissions("invoices.view")
  async getContract(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.revenueService.getContract(user.organization_id, id);
  }

  // ─── Schedule Generation (stateless preview) ───────────────

  @Post("revenue/schedules/preview")
  @Permissions("invoices.view")
  async previewSchedule(
    @Body() body: GenerateScheduleForPobInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleGenerator.generateSchedule(user.organization_id, body);
  }

  // ─── Schedule Management ────────────────────────────────────

  @Post("revenue/schedules/:pobId/generate")
  @Permissions("invoices.create")
  async generateSchedule(
    @Param("pobId", ParseIntPipe) pobId: number,
    @Body() body: GenerateScheduleForPobInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.revenueService.generateScheduleForPob(user.organization_id, pobId, body);
  }

  @Get("revenue/schedules/:pobId")
  @Permissions("invoices.view")
  async getSchedulesForPob(
    @Param("pobId", ParseIntPipe) pobId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.revenueService.getSchedulesForPob(user.organization_id, pobId);
  }

  // ─── Recognition Scheduler ──────────────────────────────────

  @Post("revenue/recognitions/run")
  @Permissions("invoices.create")
  async runRecognitionScan() {
    return this.recognitionScheduler.processDueRecognitions();
  }

  @Post("revenue/recognitions/items/:itemId/recognize")
  @Permissions("invoices.create")
  async recognizeItem(
    @Param("itemId", ParseIntPipe) itemId: number,
  ) {
    return this.recognitionScheduler.recognizeItem(itemId);
  }

  @Get("revenue/recognitions/stats")
  @Permissions("invoices.view")
  async getRecognitionStats(
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recognitionScheduler.getRecognitionQueueStats(user.organization_id);
  }

  // ─── Reversals ──────────────────────────────────────────────

  @Post("revenue/recognitions/items/:itemId/reverse")
  @Permissions("invoices.edit")
  async reverseRecognition(
    @Param("itemId", ParseIntPipe) itemId: number,
    @Body() body: { reason: string; amount: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ledgerPosting.reverseRecognition(
      user.organization_id,
      itemId,
      body.amount,
      body.reason || "Manual reversal",
      user.email ?? `user:${user.sub}`,
    );
  }
}
