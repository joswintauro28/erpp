import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MonthEndCloseService {
  private readonly logger = new Logger(MonthEndCloseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPeriods(organizationId: number) {
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { organizationId },
      orderBy: { startDate: "desc" },
    });

    return {
      periods: periods.map((p) => ({
        id: p.id,
        label: p.label,
        start_date: p.startDate.toISOString().split("T")[0],
        end_date: p.endDate.toISOString().split("T")[0],
        is_closed: p.isClosed,
        closed_at: p.closedAt?.toISOString().split("T")[0] ?? null,
      })),
    };
  }

  async getChecklist(organizationId: number, periodId: number) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");

    const start = period.startDate;
    const end = period.endDate;

    // 1. Bank Reconciliation validation
    const unreconciledBankTxCount = await this.prisma.bankTransaction.count({
      where: {
        organizationId,
        transactionDate: { gte: start, lte: end },
        classification: { not: "Matched" },
      },
    });

    // 2. Revenue Recognition validation
    const unpostedRevScheduleItemsCount = await this.prisma.revenueScheduleItem.count({
      where: {
        organizationId,
        recognitionDate: { gte: start, lte: end },
        status: { not: "Posted" },
      },
    });

    // 3. COGS Posting validation
    const unpostedCogsCount = await this.prisma.cogsPosting.count({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
        status: { not: "Posted" },
      },
    });

    // 4. Receivable validation (Invoices must not be Draft)
    const draftInvoicesCount = await this.prisma.invoice.count({
      where: {
        organizationId,
        issueDate: { gte: start, lte: end },
        status: "draft",
      },
    });

    // 5. Journal Balancing validation
    const ledgerSum = await this.prisma.ledgerEntry.aggregate({
      where: {
        organizationId,
        entryDate: { gte: start, lte: end },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });
    const debitTotal = Number(ledgerSum._sum.debit ?? 0);
    const creditTotal = Number(ledgerSum._sum.credit ?? 0);
    const difference = Math.abs(debitTotal - creditTotal);
    const isBalanced = difference < 0.01;

    return {
      period_id: periodId,
      label: period.label,
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
      is_closed: period.isClosed,
      checklist: {
        bank_reconciliation: {
          status: unreconciledBankTxCount === 0 ? "passed" : "failed",
          message: unreconciledBankTxCount === 0 
            ? "All bank transactions matched" 
            : `${unreconciledBankTxCount} unmatched bank transactions remaining`,
          count: unreconciledBankTxCount,
        },
        revenue_recognition: {
          status: unpostedRevScheduleItemsCount === 0 ? "passed" : "failed",
          message: unpostedRevScheduleItemsCount === 0 
            ? "All revenue schedules posted" 
            : `${unpostedRevScheduleItemsCount} unposted revenue schedule items remaining`,
          count: unpostedRevScheduleItemsCount,
        },
        cogs_posting: {
          status: unpostedCogsCount === 0 ? "passed" : "failed",
          message: unpostedCogsCount === 0 
            ? "All COGS transactions posted" 
            : `${unpostedCogsCount} unposted COGS records remaining`,
          count: unpostedCogsCount,
        },
        receivable_validation: {
          status: draftInvoicesCount === 0 ? "passed" : "failed",
          message: draftInvoicesCount === 0 
            ? "No draft invoices in period" 
            : `${draftInvoicesCount} draft invoices remaining`,
          count: draftInvoicesCount,
        },
        journal_balancing: {
          status: isBalanced ? "passed" : "failed",
          message: isBalanced 
            ? "Debits equal credits" 
            : `Out of balance: debits ${debitTotal} and credits ${creditTotal} differ by ${difference}`,
          debit_total: debitTotal,
          credit_total: creditTotal,
          difference,
        },
      },
      can_close: unreconciledBankTxCount === 0 &&
                  unpostedRevScheduleItemsCount === 0 &&
                  unpostedCogsCount === 0 &&
                  draftInvoicesCount === 0 &&
                  isBalanced,
    };
  }

  async closePeriod(organizationId: number, periodId: number, userId: number, signOffComments?: string) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");
    if (period.isClosed) throw new BadRequestException("Period is already closed");

    const now = new Date();
    if (now < period.endDate) {
      throw new BadRequestException("Cannot close a period before its end date");
    }

    const checklistStatus = await this.getChecklist(organizationId, periodId);
    if (!checklistStatus.can_close) {
      await this.prisma.closeAuditLog.create({
        data: {
          organizationId,
          periodId,
          action: "VALIDATION_FAILED",
          performedBy: userId,
          details: JSON.stringify(checklistStatus.checklist),
        },
      });
      throw new BadRequestException("Cannot close period: prerequisite validations failed. Check period checklist.");
    }

    await this.prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: {
        isClosed: true,
        closedAt: now,
        closedBy: userId,
      },
    });

    await this.prisma.closeSignOff.create({
      data: {
        organizationId,
        periodId,
        role: "Controller",
        userId,
        comments: signOffComments ?? "Month-End Close validation passed and period locked.",
      },
    });

    await this.prisma.closeAuditLog.create({
      data: {
        organizationId,
        periodId,
        action: "CLOSE",
        performedBy: userId,
        details: "Period successfully closed and locked. Controller sign-off completed.",
      },
    });

    this.logger.log(`Period "${period.label}" closed by user ${userId}`);
    return { message: `Period "${period.label}" closed successfully` };
  }

  async signOffPeriod(organizationId: number, periodId: number, userId: number, role: string, comments?: string) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");
    if (!period.isClosed) throw new BadRequestException("Cannot sign off an open period");

    const signOff = await this.prisma.closeSignOff.upsert({
      where: { periodId_role: { periodId, role } },
      create: {
        organizationId,
        periodId,
        role,
        userId,
        comments,
      },
      update: {
        userId,
        comments,
        signedAt: new Date(),
      },
    });

    await this.prisma.closeAuditLog.create({
      data: {
        organizationId,
        periodId,
        action: `SIGNOFF_${role.toUpperCase()}`,
        performedBy: userId,
        details: `Sign-off completed by role ${role}. Comments: ${comments ?? "none"}`,
      },
    });

    return { message: `Sign-off completed for role: ${role}`, signOff };
  }

  async submitReopenRequest(organizationId: number, periodId: number, userId: number, reason: string) {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");
    if (!period.isClosed) throw new BadRequestException("Period is not closed");

    const request = await this.prisma.reopenRequest.create({
      data: {
        organizationId,
        periodId,
        reason,
        requestedBy: userId,
        status: "Pending",
      },
    });

    await this.prisma.closeAuditLog.create({
      data: {
        organizationId,
        periodId,
        action: "REOPEN_REQUEST",
        performedBy: userId,
        details: `Reopen request submitted. Reason: ${reason}`,
      },
    });

    return { message: "Reopen request submitted successfully", request_id: request.id };
  }

  async approveReopenRequest(organizationId: number, requestId: number, userId: number, comments?: string) {
    const request = await this.prisma.reopenRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) throw new BadRequestException("Reopen request not found");
    if (request.status !== "Pending") throw new BadRequestException(`Request is already ${request.status}`);

    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id: request.periodId, organizationId },
    });
    if (!period) throw new BadRequestException("Period not found");

    await this.prisma.$transaction(async (tx) => {
      await tx.reopenRequest.update({
        where: { id: requestId },
        data: {
          status: "Approved",
          approvedBy: userId,
          approvedAt: new Date(),
          comments,
        },
      });

      await tx.fiscalPeriod.update({
        where: { id: request.periodId },
        data: {
          isClosed: false,
          closedAt: null,
          closedBy: null,
        },
      });

      await tx.closeAuditLog.create({
        data: {
          organizationId,
          periodId: request.periodId,
          action: "REOPEN",
          performedBy: userId,
          details: `Reopen request approved. Reopened period: "${period.label}". Comments: ${comments ?? "none"}`,
        },
      });
    });

    this.logger.log(`Period "${period.label}" reopened by user ${userId}`);
    return { message: `Period "${period.label}" reopened successfully` };
  }

  async getCloseStatus(organizationId: number) {
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { organizationId },
      orderBy: { endDate: "desc" },
      take: 12,
    });

    const lastClosed = periods.find((p) => p.isClosed);
    const currentOpen = periods.find((p) => !p.isClosed);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const signOffs = lastClosed
      ? await this.prisma.closeSignOff.findMany({ where: { periodId: lastClosed.id } })
      : [];

    const pendingRequests = await this.prisma.reopenRequest.findMany({
      where: { organizationId, status: "Pending" },
      orderBy: { createdAt: "desc" },
    });

    return {
      current_month: currentMonth,
      last_closed_period: lastClosed
        ? {
            id: lastClosed.id,
            label: lastClosed.label,
            closed_at: lastClosed.closedAt?.toISOString().split("T")[0] ?? null,
            sign_offs: signOffs.map((s) => ({
              role: s.role,
              signed_by: s.userId,
              signed_at: s.signedAt,
            })),
          }
        : null,
      current_open_period: currentOpen ? { id: currentOpen.id, label: currentOpen.label } : null,
      total_closed: periods.filter((p) => p.isClosed).length,
      total_open: periods.filter((p) => !p.isClosed).length,
      pending_reopen_requests: pendingRequests.map((r) => ({
        id: r.id,
        period_id: r.periodId,
        reason: r.reason,
        requested_by: r.requestedBy,
        created_at: r.createdAt,
      })),
    };
  }
}
