export class PerformanceObligationInput {
  externalObligationId!: string;
  obligationNumber!: string;
  name!: string;
  productId?: number;
  productName?: string;
  sspValue!: number;
  recognitionMethod!: string;
  recognitionTrigger!: string;
  milestones?: Array<{
    name: string;
    targetDate: string;
    amount: number;
  }>;
  usageEstimates?: Array<{
    name: string;
    periodStart: string;
    periodEnd: string;
    estimatedUnits: number;
    unitPrice: number;
  }>;
}

export class ContractAllocationInput {
  organizationId!: number;
  contractId?: number;
  externalContractId!: string;
  contractNumber!: string;
  clientId!: number;
  clientName!: string;
  startDate!: string;
  endDate!: string;
  transactionPrice!: number;
  variableConsiderations?: Array<{
    type: string;
    estimatedAmount: number;
    confidenceLevel?: number;
  }>;
  performanceObligations!: PerformanceObligationInput[];
}

export interface SspAllocationResult {
  contractId: string;
  transactionPrice: number;
  totalSspSum: number;
  variableConsiderationsTotal: number;
  adjustedTransactionPrice: number;
  performanceObligations: Array<{
    externalObligationId: string;
    obligationNumber: string;
    name: string;
    sspValue: number;
    allocationRatio: number;
    allocatedAmount: number;
    recognitionMethod: string;
    recognitionTrigger: string;
  }>;
}

export class VariableConsiderationDto {
  type!: string;
  estimatedAmount!: number;
  confidenceLevel?: number;
}
