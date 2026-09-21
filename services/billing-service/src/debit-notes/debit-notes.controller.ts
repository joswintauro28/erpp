import {
  Controller,
  Get,
  Post,
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
import { DebitNotesService } from "./debit-notes.service";
import { CreateDebitNoteDto } from "./dto/create-debit-note.dto";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("invoices/debit-notes")
@UseGuards(AuthGuard, PermissionsGuard)
export class DebitNotesController {
  constructor(private readonly debitNotesService: DebitNotesService) {}

  @Get()
  @Permissions("invoices.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.debitNotesService.findAll(user.organization_id);
  }

  @Post()
  @Permissions("invoices.create")
  async create(
    @Body() dto: CreateDebitNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.debitNotesService.create(user.organization_id, dto, user.email);
  }

  @Delete(":id")
  @Permissions("invoices.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.debitNotesService.remove(id, user.organization_id, user.email);
  }
}
