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
import { CreditNotesService } from "./credit-notes.service";
import { CreateCreditNoteDto } from "./dto/create-credit-note.dto";
import type { JwtPayload } from "../auth/auth.guard";

@Controller("invoices/credit-notes")
@UseGuards(AuthGuard, PermissionsGuard)
export class CreditNotesController {
  constructor(private readonly creditNotesService: CreditNotesService) {}

  @Get()
  @Permissions("invoices.view")
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.creditNotesService.findAll(user.organization_id);
  }

  @Post()
  @Permissions("invoices.create")
  async create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.creditNotesService.create(user.organization_id, dto, user.email);
  }

  @Delete(":id")
  @Permissions("invoices.delete")
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.creditNotesService.remove(id, user.organization_id, user.email);
  }
}
