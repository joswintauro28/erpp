import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { QuotationsService } from "./quotations.service";
import { CreateQuotationDto } from "./dto/create-quotation.dto";
import type { JwtPayload } from "../auth/auth.guard";
import { QuotationStatus } from "@prisma/client";

@Controller("invoices/quotations")
@UseGuards(AuthGuard, PermissionsGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  @Permissions("quotations.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.quotationsService.findAll(user.organization_id);
  }

  @Get(":id")
  @Permissions("quotations.view")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.findOne(id, user.organization_id);
  }

  @Post()
  @Permissions("quotations.create")
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.create(user.organization_id, dto);
  }

  @Put(":id")
  @Permissions("quotations.edit")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuotationDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.update(id, user.organization_id, dto);
  }

  @Put(":id/status")
  @Permissions("quotations.edit")
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Query("status") status: QuotationStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.updateStatus(id, user.organization_id, status);
  }

  @Delete(":id")
  @Permissions("quotations.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.quotationsService.remove(id, user.organization_id);
  }

  @Post(":id/convert")
  @Permissions("quotations.edit")
  async convertToInvoice(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.convertToInvoice(id, user.organization_id);
  }
}
