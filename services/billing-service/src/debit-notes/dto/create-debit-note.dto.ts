import { IsNumber, IsOptional, IsString, Min, Matches } from "class-validator";
import { DOCUMENT_ID_RE } from "../../common/document-number.service";

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
  @Matches(DOCUMENT_ID_RE, { message: "debitNoteNumber must match [PREFIX]-YYYYMM-NNNN (e.g. DN-202608-0001)" })
  debitNoteNumber?: string;
}
