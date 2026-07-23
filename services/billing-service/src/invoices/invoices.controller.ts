import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { CreateInvoiceFromDispatchDto } from "./dto/create-invoice-from-dispatch.dto";
import { UpdateInvoiceStatusDto } from "./dto/update-invoice-status.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("invoices")
@UseGuards(AuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Permissions("invoices.view")
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query("type") type?: string,
    @Query("status") status?: string,
  ) {
    return this.invoicesService.findAll(user.organization_id, type, status);
  }

  @Get(":id")
  @Permissions("invoices.view")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.findOne(id, user.organization_id);
  }

  @Post()
  @Permissions("invoices.create")
  async create(
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.create(user.organization_id, dto);
  }

  @Put(":id")
  @Permissions("invoices.edit")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.update(id, user.organization_id, dto);
  }

  @Post("from-dispatch")
  @Permissions("invoices.create")
  async createFromDispatch(
    @Body() dto: CreateInvoiceFromDispatchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.createFromDispatch(user.organization_id, dto);
  }

  @Put(":id/status")
  @Permissions("invoices.edit")
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateInvoiceStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invoicesService.updateStatus(id, user.organization_id, dto.status);
  }

  @Delete(":id")
  @Permissions("invoices.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.invoicesService.delete(id, user.organization_id);
  }
}
