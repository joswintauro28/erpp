import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  ValidateNested,
  IsDateString,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { GstTreatment } from "@prisma/client";
import { DOCUMENT_ID_RE } from "../../common/document-number.service";

export class CreateQuotationItemDto {
  @IsString()
  description!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  gstRate!: number;
}

export class CreateQuotationDto {
  @IsNumber()
  clientId!: number;

  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  @Matches(DOCUMENT_ID_RE, { message: "quotationNumber must match [PREFIX]-YYYYMM-NNNN (e.g. QT-202608-0001)" })
  quotationNumber?: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsEnum(GstTreatment)
  gstTreatment?: GstTreatment;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // CPQ: discount applied to the quotation subtotal (CRM enforces the
  // internal approval threshold; billing just prices it).
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items!: CreateQuotationItemDto[];
}
