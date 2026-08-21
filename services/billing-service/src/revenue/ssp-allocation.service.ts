import { Injectable, Logger } from "@nestjs/common";
import type { SspAllocationResult, PerformanceObligationInput } from "./dto/allocate-ssp.dto";

@Injectable()
export class SspAllocationService {
  private readonly logger = new Logger(SspAllocationService.name);

  allocateTransactionPrice(params: {
    externalContractId: string;
    transactionPrice: number;
    variableConsiderations: Array<{ type: string; estimatedAmount: number; confidenceLevel?: number }>;
    performanceObligations: PerformanceObligationInput[];
  }): SspAllocationResult {
    const { externalContractId, transactionPrice, variableConsiderations, performanceObligations } = params;

    if (!performanceObligations.length) {
      throw new Error("At least one performance obligation is required");
    }
    if (transactionPrice < 0) {
      throw new Error("Transaction price cannot be negative");
    }

    const variableTotal = this.computeVariableConsiderationTotal(variableConsiderations);
    const adjustedTransactionPrice = transactionPrice + variableTotal;

    const totalSspSum = performanceObligations.reduce(
      (sum, pob) => sum + pob.sspValue,
      0,
    );

    if (totalSspSum <= 0) {
      throw new Error("Total SSP sum must be greater than zero");
    }

    const allocatedObligations = performanceObligations.map((pob) => {
      const allocationRatio = pob.sspValue / totalSspSum;
      const allocatedAmount = Number(
        (allocationRatio * adjustedTransactionPrice).toFixed(2),
      );

      return {
        externalObligationId: pob.externalObligationId,
        obligationNumber: pob.obligationNumber,
        name: pob.name,
        sspValue: pob.sspValue,
        allocationRatio,
        allocatedAmount,
        recognitionMethod: pob.recognitionMethod,
        recognitionTrigger: pob.recognitionTrigger,
      };
    });

    this.logger.log(
      `Allocated ${adjustedTransactionPrice} across ${allocatedObligations.length} POBs ` +
      `(contract: ${externalContractId}, total SSP: ${totalSspSum})`,
    );

    return {
      contractId: externalContractId,
      transactionPrice,
      totalSspSum,
      variableConsiderationsTotal: variableTotal,
      adjustedTransactionPrice,
      performanceObligations: allocatedObligations,
    };
  }

  allocateByCustomRatios(params: {
    externalContractId: string;
    transactionPrice: number;
    variableConsiderations: Array<{ type: string; estimatedAmount: number; confidenceLevel?: number }>;
    performanceObligations: Array<{
      externalObligationId: string;
      obligationNumber: string;
      name: string;
      customRatio: number;
      recognitionMethod: string;
      recognitionTrigger: string;
    }>;
  }): SspAllocationResult {
    const { externalContractId, transactionPrice, variableConsiderations, performanceObligations } = params;

    const variableTotal = this.computeVariableConsiderationTotal(variableConsiderations);
    const adjustedTransactionPrice = transactionPrice + variableTotal;

    const totalRatio = performanceObligations.reduce((sum, pob) => sum + pob.customRatio, 0);

    if (Math.abs(totalRatio - 1.0) > 0.0001) {
      throw new Error(`Custom ratios must sum to 1.0 (got ${totalRatio})`);
    }

    const allocatedObligations = performanceObligations.map((pob) => ({
      externalObligationId: pob.externalObligationId,
      obligationNumber: pob.obligationNumber,
      name: pob.name,
      sspValue: 0,
      allocationRatio: pob.customRatio,
      allocatedAmount: Number((pob.customRatio * adjustedTransactionPrice).toFixed(2)),
      recognitionMethod: pob.recognitionMethod,
      recognitionTrigger: pob.recognitionTrigger,
    }));

    return {
      contractId: externalContractId,
      transactionPrice,
      totalSspSum: 0,
      variableConsiderationsTotal: variableTotal,
      adjustedTransactionPrice,
      performanceObligations: allocatedObligations,
    };
  }

  private computeVariableConsiderationTotal(
    variables: Array<{ type: string; estimatedAmount: number; confidenceLevel?: number }>,
  ): number {
    if (!variables?.length) return 0;

    return variables.reduce((total, vc) => {
      const confidence = vc.confidenceLevel ?? 1.0;
      if (confidence >= 0.9) {
        return total + vc.estimatedAmount;
      }
      if (confidence >= 0.5) {
        return total + vc.estimatedAmount * confidence;
      }
      return total;
    }, 0);
  }
}
