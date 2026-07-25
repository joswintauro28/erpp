import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateDebitNoteDto {
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
  debitNoteNumber?: string;
}
