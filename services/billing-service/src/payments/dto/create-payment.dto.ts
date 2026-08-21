import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
  Min,
} from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @IsNumber()
  invoiceId!: number;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
