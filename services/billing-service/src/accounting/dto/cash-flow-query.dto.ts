import { IsOptional, IsString, IsEnum } from "class-validator";

export enum CashFlowReportingMode {
  DIRECT = "direct",
  INDIRECT = "indirect",
}

export class CashFlowQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(CashFlowReportingMode)
  reportingMode?: CashFlowReportingMode = CashFlowReportingMode.DIRECT;
}
