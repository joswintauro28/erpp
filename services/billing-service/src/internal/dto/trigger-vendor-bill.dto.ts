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

export class VendorBillItemDto {
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
}

export class TriggerVendorBillDto {
  @IsNumber()
  vendorId!: number;

  @IsString()
  vendorName!: string;

  @IsOptional()
  @IsDateString()
  billDate?: string;

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

  @IsOptional()
  @IsString()
  poReference?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @IsString()
  gstTreatment?: "intrastate" | "interstate";

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorBillItemDto)
  items!: VendorBillItemDto[];
}
