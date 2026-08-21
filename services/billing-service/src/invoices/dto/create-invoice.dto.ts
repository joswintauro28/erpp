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

export class CreateInvoiceItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @IsString()
  type?: "receivable" | "payable";

  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsNumber()
  vendorId?: number;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  @Matches(DOCUMENT_ID_RE, { message: "invoiceNumber must match [PREFIX]-YYYYMM-NNNN (e.g. INV-202608-0001)" })
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  salesOrderCode?: string;

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsEnum(GstTreatment)
  gstTreatment?: GstTreatment;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];
}
