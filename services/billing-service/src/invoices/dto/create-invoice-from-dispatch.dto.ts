import { IsString, IsNumber, IsOptional, IsArray, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class DispatchItemDto {
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
  costPrice?: number;

  @IsNumber()
  @Min(0)
  gstRate!: number;
}

export class CreateInvoiceFromDispatchDto {
  @IsNumber()
  clientId!: number;

  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  dispatchReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchItemDto)
  items!: DispatchItemDto[];
}
