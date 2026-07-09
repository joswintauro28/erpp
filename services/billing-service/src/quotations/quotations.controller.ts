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
  @Permissions("invoices.quotations.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.quotationsService.findAll(user.user_id);
  }

  @Get(":id")
  @Permissions("invoices.quotations.view")
  async findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.findOne(id, user.user_id);
  }

  @Post()
  @Permissions("invoices.quotations.create")
  async create(
    @Body() dto: CreateQuotationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.create(
      user.user_id,
      dto,
      user.organization_id,
    );
  }

  @Put(":id")
  @Permissions("invoices.quotations.update")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuotationDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.update(id, user.user_id, dto);
  }

  @Put(":id/status")
  @Permissions("invoices.quotations.update")
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Query("status") status: QuotationStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.updateStatus(id, user.user_id, status);
  }

  @Delete(":id")
  @Permissions("invoices.quotations.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.quotationsService.remove(id, user.user_id);
  }

  @Post(":id/convert")
  @Permissions("invoices.quotations.convert")
  async convertToInvoice(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quotationsService.convertToInvoice(
      id,
      user.user_id,
      user.organization_id,
    );
  }
}
