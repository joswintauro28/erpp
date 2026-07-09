import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateRecurringItemDto {
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

export class CreateRecurringInvoiceDto {
  @IsNumber()
  clientId!: number;

  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsString()
  interval!: string;

  @IsOptional()
  @IsDateString()
  nextInvoiceDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoEmail?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecurringItemDto)
  items!: CreateRecurringItemDto[];
}
