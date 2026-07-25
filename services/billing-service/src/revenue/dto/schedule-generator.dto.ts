import { createHash } from "node:crypto";

export class GenerateScheduleForPobInput {
  contractId!: number;
  performanceObligationId!: number;
  allocatedAmount!: number;
  startDate!: string;
  endDate!: string;
  recognitionMethod!: "STRAIGHT_LINE" | "MILESTONE" | "USAGE" | "MANUAL" | "HYBRID";
  recognitionTrigger!: "TIME_ELAPSED" | "EVENT_RECEIVED" | "MILESTONE_MET" | "MANUAL";
  frequency?: "daily" | "monthly";
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

export interface ScheduleItemOutput {
  periodStartDate: Date;
  periodEndDate: Date;
  recognitionDate: Date;
  nextRecognitionDate: Date | null;
  amount: number;
  idempotencyKey: string;
  sourceEventType: string;
}

export interface GeneratedScheduleOutput {
  contractId: number;
  performanceObligationId: number;
  version: number;
  items: ScheduleItemOutput[];
}

export function makeIdempotencyKey(
  organizationId: number,
  pobId: number,
  version: number,
  periodStart: string,
  periodEnd: string,
): string {
  const raw = `${organizationId}:${pobId}:${version}:${periodStart}:${periodEnd}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}
