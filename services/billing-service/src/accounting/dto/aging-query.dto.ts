import { IsOptional, IsString, IsInt, IsNumber, IsBoolean, IsEnum, Min, Max } from "class-validator";
import { Type, Transform } from "class-transformer";

export class AgingQueryDto {
  @IsOptional()
  @IsString()
  asOfDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number;

  @IsOptional()
  @IsString()
  customerGroup?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  agingBucket?: string; // 'current' | '1_30' | '31_60' | '61_90' | 'over_90'

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salespersonId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  territoryId?: number;

  @IsOptional()
  @IsString()
  gstState?: string;

  @IsOptional()
  @IsString()
  dueDateFrom?: string;

  @IsOptional()
  @IsString()
  dueDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBalance?: number;

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  validate?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string = "dueDate";

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "asc";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  format?: "csv" | "xlsx" | "pdf" = "csv";

  @IsOptional()
  @IsString()
  view?: "summary" | "customers" | "invoices" = "summary";
}
