import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { RecurringInvoicesService } from "./recurring-invoices.service";
import { CreateRecurringInvoiceDto } from "./dto/create-recurring-invoice.dto";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("invoices/recurring")
@UseGuards(AuthGuard, PermissionsGuard)
export class RecurringInvoicesController {
  constructor(
    private readonly recurringInvoicesService: RecurringInvoicesService,
  ) {}

  @Get()
  @Permissions("invoices.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.recurringInvoicesService.findAll(user.organization_id);
  }

  @Get(":id")
  @Permissions("invoices.view")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recurringInvoicesService.findOne(id, user.organization_id);
  }

  @Post()
  @Permissions("invoices.create")
  async create(
    @Body() dto: CreateRecurringInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recurringInvoicesService.create(user.organization_id, dto);
  }

  @Put(":id")
  @Permissions("invoices.edit")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: Partial<CreateRecurringInvoiceDto> & { status?: "active" | "paused" | "completed" },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recurringInvoicesService.update(id, user.organization_id, dto);
  }

  @Delete(":id")
  @Permissions("invoices.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.recurringInvoicesService.remove(id, user.organization_id);
  }
}
