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

export class UpdateInvoiceItemDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  product_id?: number;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unit_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gst_rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gst_percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  type?: "receivable" | "payable";

  @IsOptional()
  @IsNumber()
  clientId?: number;

  @IsOptional()
  @IsNumber()
  client_id?: number;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  client_name?: string;

  @IsOptional()
  @IsNumber()
  vendorId?: number;

  @IsOptional()
  @IsNumber()
  vendor_id?: number;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @IsOptional()
  @IsString()
  vendor_name?: string;

  @IsOptional()
  @IsString()
  @Matches(DOCUMENT_ID_RE, { message: "invoiceNumber must match [PREFIX]-YYYYMM-NNNN (e.g. INV-202608-0001)" })
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(DOCUMENT_ID_RE, { message: "invoice_number must match [PREFIX]-YYYYMM-NNNN (e.g. INV-202608-0001)" })
  invoice_number?: string;

  @IsOptional()
  @IsEnum(GstTreatment)
  gstTreatment?: GstTreatment;

  @IsOptional()
  @IsEnum(GstTreatment)
  gst_treatment?: GstTreatment;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  place_of_supply?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  issue_date?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  due_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  discount_type?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateInvoiceItemDto)
  items?: UpdateInvoiceItemDto[];
}

