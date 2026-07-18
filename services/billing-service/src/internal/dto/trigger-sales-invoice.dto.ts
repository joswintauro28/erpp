import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export class SalesInvoiceItemDto {
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

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;
}

export class TriggerSalesInvoiceDto {
  @IsNumber()
  clientId!: number;

  @IsString()
  clientName!: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountType?: string;

  @IsOptional()
  @IsString()
  gstTreatment?: "intrastate" | "interstate";

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  orderReference?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceItemDto)
  items!: SalesInvoiceItemDto[];
}
