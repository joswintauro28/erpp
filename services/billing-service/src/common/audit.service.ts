import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AuditEntityType = "invoice" | "payment" | "credit_note" | "debit_note" | "quotation";
export type AuditAction = "create" | "update" | "delete" | "status_change";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    organizationId: number,
    entityType: AuditEntityType,
    entityId: number,
    action: AuditAction,
    performedBy: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await (this.prisma as any).billingAuditLog.create({
        data: {
          organizationId,
          entityType,
          entityId,
          action,
          performedBy,
          details: details ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `Audit log failed: ${entityType}:${entityId} ${action} by ${performedBy}`,
        err,
      );
    }
  }
}
