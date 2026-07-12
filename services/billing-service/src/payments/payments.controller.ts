import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("payments")
@UseGuards(AuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @Permissions("payments.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.findAll(user.organization_id);
  }

  @Post()
  @Permissions("payments.create")
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.create(user.organization_id, dto);
  }

  @Post(":id/refund")
  @Permissions("payments.edit")
  async refund(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.refund(id, user.organization_id);
  }

  @Get("metrics")
  @Permissions("payments.view")
  async getMetrics(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getMetrics(user.organization_id);
  }
}
