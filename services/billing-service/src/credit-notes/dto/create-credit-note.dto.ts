import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateCreditNoteDto {
  @IsNumber()
  invoiceId!: number;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  creditNoteNumber?: string;
}
