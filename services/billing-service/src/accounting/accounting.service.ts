import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";
import { CashFlowQueryDto, CashFlowReportingMode } from "./dto/cash-flow-query.dto";
import { PostingEngineService } from "./posting-engine.service";

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly postingEngine: PostingEngineService,
  ) {}


  async getAccounts(organizationId: number) {
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
    });
    return {
      accounts: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type,
        sub_type: a.subType,
        group: a.subType ?? "General",
        description: a.description,
        opening_balance: 0,
        current_balance: Number(a.balance),
        balance: Number(a.balance),
        is_active: a.isActive,
      })),
    };
  }

  async getExpenses(organizationId: number) {
    const expenses = await this.prisma.expense.findMany({
      where: { organizationId },
      orderBy: { date: "desc" },
      include: {
        account: { select: { name: true, code: true } },
      },
    });
    return {
      expenses: expenses.map((e) => ({
        id: e.id,
        date: e.date.toISOString().split("T")[0],
        category: e.category ?? "General",
        description: e.description ?? "",
        amount: Number(e.amount),
        status: e.status as "paid" | "pending" | "void",
        account_name: e.account.name,
        account_code: e.account.code,
        paid_to: e.account.name,
        payment_method: e.paymentMethod ?? "",
        reference: e.reference ?? "",
        bill_number: e.reference ?? "",
        notes: "",
      })),
    };
  }

  async getLedger(organizationId: number) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { organizationId },
      orderBy: { entryDate: "desc" },
      take: 200,
      include: {
        account: { select: { name: true } },
      },
    });
    let runningBalance = 0;
    return {
      ledger: entries.reverse().map((e) => {
        runningBalance += Number(e.debit) - Number(e.credit);
        return {
          id: e.id,
          entry_date: e.entryDate.toISOString().split("T")[0],
          date: e.entryDate.toISOString().split("T")[0],
          account_code: e.accountId,
          account_id: e.accountId,
          account_name: e.account.name,
          description: e.description,
          reference_type: e.referenceType ?? "Journal",
          voucher_type: e.referenceType ?? "Journal",
          reference_id: e.referenceId ?? null,
          voucher_number: e.referenceId ? `#${e.referenceId}` : "",
          debit: Number(e.debit),
          credit: Number(e.credit),
          balance: runningBalance,
        };
      }).reverse(),
    };
  }

  async getReports(organizationId: number) {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = (k: string) => {
      const m = parseInt(k.split("-")[1], 10);
      return monthNames[m - 1] ?? k;
    };

    const [invoices, expenses, accounts, invoiceItems, creditNotes, debitNotes] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: ["paid", "sent", "partially_paid", "overdue"] },
          issueDate: { not: null },
        },
        select: { id: true, total: true, issueDate: true },
      }),
      this.prisma.expense.findMany({
        where: { organizationId },
        select: { amount: true, date: true },
      }),
      this.prisma.account.findMany({
        where: { organizationId, isActive: true },
        orderBy: { code: "asc" },
      }),
      this.prisma.invoiceItem.findMany({
        where: {
          invoice: {
            organizationId,
            status: { in: ["paid", "sent", "partially_paid", "overdue"] },
            issueDate: { not: null },
          },
        },
        select: {
          quantity: true,
          costPrice: true,
          invoice: { select: { issueDate: true } },
        },
      }),
      this.prisma.creditNote.findMany({
        where: { organizationId, status: "issued" },
        select: { amount: true, issueDate: true },
      }),
      this.prisma.debitNote.findMany({
        where: { organizationId, status: "issued" },
        select: { amount: true, issueDate: true },
      }),
    ]);

    const revenueByMonth: Record<string, number> = {};
    for (const inv of invoices) {
      if (!inv.issueDate) continue;
      const k = key(inv.issueDate);
      revenueByMonth[k] = (revenueByMonth[k] ?? 0) + Number(inv.total);
    }

    const creditNoteByMonth: Record<string, number> = {};
    for (const cn of creditNotes) {
      if (!cn.issueDate) continue;
      const k = key(cn.issueDate);
      creditNoteByMonth[k] = (creditNoteByMonth[k] ?? 0) + Number(cn.amount);
    }

    const debitNoteByMonth: Record<string, number> = {};
    for (const dn of debitNotes) {
      if (!dn.issueDate) continue;
      const k = key(dn.issueDate);
      debitNoteByMonth[k] = (debitNoteByMonth[k] ?? 0) + Number(dn.amount);
    }

    // Adjust revenue: credit notes reduce, debit notes increase
    for (const k of Object.keys(creditNoteByMonth)) {
      revenueByMonth[k] = (revenueByMonth[k] ?? 0) - creditNoteByMonth[k];
    }
    for (const k of Object.keys(debitNoteByMonth)) {
      revenueByMonth[k] = (revenueByMonth[k] ?? 0) + debitNoteByMonth[k];
    }

    const cogsByMonth: Record<string, number> = {};
    for (const item of invoiceItems) {
      if (!item.invoice.issueDate) continue;
      const k = key(item.invoice.issueDate);
      const cost = Number(item.quantity) * Number(item.costPrice);
      cogsByMonth[k] = (cogsByMonth[k] ?? 0) + cost;
    }

    const expenseByMonth: Record<string, number> = {};
    for (const exp of expenses) {
      const k = key(exp.date);
      expenseByMonth[k] = (expenseByMonth[k] ?? 0) + Number(exp.amount);
    }

    const allMonths = [...new Set([...Object.keys(revenueByMonth), ...Object.keys(cogsByMonth), ...Object.keys(expenseByMonth)])].sort();

    const pl = allMonths.map((k) => {
      const rev = revenueByMonth[k] ?? 0;
      const cogs = cogsByMonth[k] ?? 0;
      const exp = expenseByMonth[k] ?? 0;
      return {
        month: label(k),
        revenue: Math.round(rev),
        cost_of_goods: Math.round(cogs),
        gross_profit: Math.round(rev - cogs),
        operating_expenses: Math.round(exp),
        net_profit: Math.round(rev - cogs - exp),
      };
    });

    const typeOrder = ["Asset", "Liability", "Equity"] as const;
    const displayNames: Record<string, string> = {
      Asset: "Assets",
      Liability: "Liabilities",
      Equity: "Equity",
    };

    const balance_sheet = typeOrder.map((type) => {
      const typeAccounts = accounts.filter((a) => a.type === type);
      const total = typeAccounts.reduce((s, a) => s + Number(a.balance), 0);
      return {
        category: displayNames[type] ?? type,
        items: [
          ...typeAccounts.map((a) => ({
            label: a.name,
            amount: Math.round(Number(a.balance)),
          })),
          { label: `Total ${displayNames[type] ?? type}`, amount: Math.round(total) },
        ],
      };
    });

    const cashFlow = this.computeCashFlow(organizationId, revenueByMonth, expenseByMonth, cogsByMonth, allMonths, label);

    return { pl, balance_sheet, cash_flow: cashFlow };
  }

  async createAccount(organizationId: number, body: any) {
    const account = await this.prisma.account.create({
      data: {
        organizationId,
        code: body.code,
        name: body.name,
        type: body.type ?? "Expense",
        subType: body.sub_type ?? body.subType ?? null,
        description: body.description ?? null,
        balance: body.balance ?? 0,
      },
    });
    return { id: account.id, code: account.code, name: account.name, message: "Account created" };
  }

  async updateAccount(id: number, organizationId: number, body: any) {
    const account = await this.prisma.account.findFirst({ where: { id, organizationId } });
    if (!account) throw new Error("Account not found");

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;
    if (body.type !== undefined) data.type = body.type;
    if (body.sub_type !== undefined || body.subType !== undefined) data.subType = body.sub_type ?? body.subType;
    if (body.description !== undefined) data.description = body.description;
    if (body.is_active !== undefined) data.isActive = body.is_active;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await this.prisma.account.update({ where: { id }, data });
    return { id: updated.id, code: updated.code, name: updated.name, is_active: updated.isActive, message: "Account updated" };
  }

  async createExpense(organizationId: number, body: any) {
    const account = body.account_id
      ? await this.prisma.account.findFirst({ where: { id: Number(body.account_id), organizationId } })
      : body.account_code
        ? await this.prisma.account.findFirst({ where: { code: body.account_code, organizationId } })
        : null;
    if (!account) return { error: "Account not found" };

    const amountNum = Number(body.amount ?? 0);

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        accountId: account.id,
        amount: new Prisma.Decimal(amountNum),
        category: body.category ?? null,
        description: body.description ?? null,
        date: body.date ? new Date(body.date) : new Date(),
        paymentMethod: body.payment_method ?? body.paymentMethod ?? null,
        reference: body.reference ?? null,
        status: body.status ?? "recorded",
      },
    });

    // Auto-Post Journal Entry using Posting Engine
    try {
      let creditRole = "ROLE_CASH";
      const method = (body.payment_method ?? body.paymentMethod ?? "").toLowerCase();
      const status = (body.status ?? "").toLowerCase();

      if (method.includes("bank") || method.includes("wire") || method.includes("transfer") || method.includes("card") || method.includes("credit")) {
        creditRole = "ROLE_BANK";
      } else if (status === "outstanding" || status === "payable" || method.includes("reimburse")) {
        creditRole = "ROLE_ACCOUNTS_PAYABLE";
      }

      const dimensions: Record<string, any> = {};
      if (body.costCenter) dimensions.cost_center = body.costCenter;
      if (body.project) dimensions.project = body.project;
      if (body.department) dimensions.department = body.department;
      if (body.branch) dimensions.branch = body.branch;

      await this.postingEngine.postJournal({
        organizationId,
        postingDate: expense.date,
        templateType: "EXPENSE",
        sourceType: "Expense",
        sourceId: expense.id,
        currency: "INR",
        createdBy: "system",
        lines: [
          {
            role: `ACCOUNT_ID:${account.id}`,
            debit: amountNum,
            credit: 0,
            dimensions,
          },
          {
            role: creditRole,
            debit: 0,
            credit: amountNum,
            dimensions,
          },
        ],
      });
    } catch (postError: any) {
      this.logger.error(`Automatic general ledger posting failed for Expense ${expense.id}: ${postError.message}`);
    }

    this.eventBus.emit(Events.ExpenseCreated, {
      organizationId,
      expenseId: expense.id,
      amount: amountNum,
      category: body.category ?? "General",
      timestamp: new Date(),
    });

    return { id: expense.id, amount: Number(expense.amount), message: "Expense recorded" };
  }


  async updateExpense(id: number, organizationId: number, body: any) {
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId } });
    if (!expense) throw new Error("Expense not found");

    const oldAmount = Number(expense.amount);
    const newAmount = body.amount !== undefined ? Number(body.amount) : oldAmount;
    const account = body.account_id
      ? await this.prisma.account.findFirst({ where: { id: Number(body.account_id), organizationId } })
      : null;

    const data: any = {};
    if (account) data.accountId = account.id;
    if (body.amount !== undefined) data.amount = new Prisma.Decimal(newAmount);
    if (body.category !== undefined) data.category = body.category;
    if (body.description !== undefined) data.description = body.description;
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.payment_method !== undefined) data.paymentMethod = body.payment_method;
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.reference !== undefined) data.reference = body.reference;
    if (body.status !== undefined) data.status = body.status;

    const updated = await this.prisma.expense.update({ where: { id }, data });

    const diff = newAmount - oldAmount;
    if (diff !== 0) {
      await this.prisma.account.update({
        where: { id: expense.accountId },
        data: { balance: { increment: new Prisma.Decimal(diff) } },
      });
    }

    return { id: updated.id, amount: Number(updated.amount), message: "Expense updated" };
  }

  async deleteExpense(id: number, organizationId: number) {
    const expense = await this.prisma.expense.findFirst({ where: { id, organizationId } });
    if (!expense) throw new Error("Expense not found");

    await this.prisma.account.update({
      where: { id: expense.accountId },
      data: { balance: { decrement: expense.amount } },
    });

    await this.prisma.expense.delete({ where: { id } });
  }

  async createExpenseFromPo(organizationId: number, body: any) {
    const apAccount = await this.prisma.account.findFirst({
      where: { organizationId, code: "2001" },
    });
    if (!apAccount) {
      return { error: "Accounts Payable account not found. Please set up your chart of accounts." };
    }

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        accountId: apAccount.id,
        amount: new Prisma.Decimal(body.total ?? 0),
        category: body.category ?? "Procurement",
        description: body.description ?? (body.po_reference ? `PO: ${body.po_reference}` : "Purchase Order"),
        date: body.date ? new Date(body.date) : new Date(),
        paymentMethod: body.paymentMethod ?? "Bank_Transfer",
        reference: body.po_reference ?? "",
        status: "pending",
      },
    });

    return {
      id: expense.id,
      message: "Expense recorded from purchase order",
      amount: Number(expense.amount),
      reference: expense.reference,
      status: expense.status,
    };
  }

  async createLedgerEntry(organizationId: number, body: any) {
    if (!body.account_id && !body.account_code) {
      return { error: "account_id or account_code is required" };
    }

    const account = body.account_id
      ? await this.prisma.account.findFirst({ where: { id: Number(body.account_id), organizationId } })
      : await this.prisma.account.findFirst({ where: { code: body.account_code, organizationId } });

    if (!account) return { error: "Account not found" };

    const debit = Number(body.debit ?? 0);
    const credit = Number(body.credit ?? 0);

    if (debit === 0 && credit === 0) {
      return { error: "Either debit or credit must be greater than zero" };
    }

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        organizationId,
        accountId: account.id,
        entryDate: body.entry_date ? new Date(body.entry_date) : new Date(),
        description: body.description ?? "Manual journal entry",
        debit: new Prisma.Decimal(debit),
        credit: new Prisma.Decimal(credit),
        referenceType: body.reference_type ?? null,
        referenceId: body.reference_id ?? null,
      },
    });

    await this.prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: new Prisma.Decimal(debit - credit) } },
    });

    return { id: entry.id, message: "Journal entry created" };
  }

  async updateLedgerEntry(id: number, organizationId: number, body: any) {
    const entry = await this.prisma.ledgerEntry.findFirst({ where: { id, organizationId } });
    if (!entry) throw new Error("Ledger entry not found");

    const oldDebit = Number(entry.debit);
    const oldCredit = Number(entry.credit);
    const newDebit = body.debit !== undefined ? Number(body.debit) : oldDebit;
    const newCredit = body.credit !== undefined ? Number(body.credit) : oldCredit;

    const data: any = {};
    if (body.account_id !== undefined) {
      const account = await this.prisma.account.findFirst({ where: { id: Number(body.account_id), organizationId } });
      if (!account) throw new Error("Account not found");
      data.accountId = account.id;
    }
    if (body.debit !== undefined) data.debit = new Prisma.Decimal(newDebit);
    if (body.credit !== undefined) data.credit = new Prisma.Decimal(newCredit);
    if (body.description !== undefined) data.description = body.description;
    if (body.entry_date !== undefined) data.entryDate = new Date(body.entry_date);
    if (body.reference_type !== undefined) data.referenceType = body.reference_type;

    const updated = await this.prisma.ledgerEntry.update({ where: { id }, data });

    const oldNet = oldDebit - oldCredit;
    const newNet = newDebit - newCredit;
    const diff = newNet - oldNet;
    if (diff !== 0) {
      await this.prisma.account.update({
        where: { id: entry.accountId },
        data: { balance: { increment: new Prisma.Decimal(diff) } },
      });
    }

    return { id: updated.id, message: "Journal entry updated" };
  }

  async getCustomerLedger(organizationId: number, clientId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId, clientId, type: "receivable" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        total: true,
        paidAmount: true,
        balanceDue: true,
        status: true,
      },
    });

    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        invoice: { clientId, type: "receivable" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceId: true,
        amount: true,
        paymentDate: true,
        status: true,
        referenceId: true,
        invoice: { select: { invoiceNumber: true } },
      },
    });

    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);

    return {
      clientId,
      summary: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        balanceOutstanding: Math.round((totalInvoiced - totalPaid) * 100) / 100,
        invoiceCount: invoices.length,
      },
      invoices: invoices.map((i) => ({
        id: i.id,
        invoice_number: i.invoiceNumber ?? `INV-${i.id}`,
        date: i.issueDate?.toISOString().split("T")[0] ?? "",
        total: Number(i.total),
        paid: Number(i.paidAmount),
        balance: Number(i.balanceDue),
        status: i.status,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        invoice: p.invoice?.invoiceNumber ?? `INV-${p.invoiceId}`,
        amount: Number(p.amount),
        date: p.paymentDate?.toISOString().split("T")[0] ?? "",
        status: p.status,
        reference: p.referenceId ?? "",
      })),
    };
  }

  private getAgingBucket(daysOverdue: number): string {
    if (daysOverdue <= 0) return "Current";
    if (daysOverdue <= 30) return "1–30 Days";
    if (daysOverdue <= 60) return "31–60 Days";
    if (daysOverdue <= 90) return "61–90 Days";
    return "Over 90 Days";
  }

  private buildReportMetadata(
    organizationId: number,
    asOfDate: Date,
    query: any,
    executionTimeMs: number,
    fiscalPeriodLabel: string = "Current Active Period"
  ) {
    return {
      reportTitle: "Accounts Receivable Aging Report",
      reportVersion: "2.0-ERP",
      organizationId,
      generatedAt: new Date().toISOString(),
      asOfDate: asOfDate.toISOString().split("T")[0],
      fiscalPeriod: fiscalPeriodLabel,
      baseCurrency: "INR",
      appliedFilters: {
        currency: query.currency ?? "ALL",
        status: query.status ?? "sent,partially_paid,overdue",
        agingBucket: query.agingBucket ?? "ALL",
        clientId: query.clientId ?? null,
        periodId: query.periodId ?? null,
      },
      executionTimeMs,
    };
  }

  async getAgingSummary(organizationId: number, query: any = {}) {
    const startTime = Date.now();
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    let fiscalPeriodLabel = "Current Active Period";
    if (query.periodId) {
      const period = await this.prisma.fiscalPeriod.findFirst({
        where: { id: Number(query.periodId), organizationId },
      });
      if (period) {
        fiscalPeriodLabel = period.label;
      }
    }

    const whereCondition: Prisma.InvoiceWhereInput = {
      organizationId,
      type: "receivable",
      status: { in: ["sent", "partially_paid", "overdue"] },
      balanceDue: { gt: 0 },
    };

    if (query.clientId) whereCondition.clientId = Number(query.clientId);
    if (query.currency) whereCondition.gstTreatment = query.currency as any; // fallback metadata check
    if (query.status) {
      const statuses = query.status.split(",") as any[];
      whereCondition.status = { in: statuses };
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereCondition,
      select: {
        id: true,
        invoiceNumber: true,
        clientId: true,
        clientName: true,
        total: true,
        balanceDue: true,
        paidAmount: true,
        dueDate: true,
        status: true,
      },
    });

    const unappliedPayments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        invoiceId: null,
        status: { in: ["cleared", "completed"] },
      },
      select: { amount: true },
    });
    const unappliedCreditsTotal = unappliedPayments.reduce((s, p) => s + Number(p.amount), 0);

    const bucketsConfig = [
      { label: "Current", minDays: -Infinity, maxDays: 0 },
      { label: "1–30 Days", minDays: 1, maxDays: 30 },
      { label: "31–60 Days", minDays: 31, maxDays: 60 },
      { label: "61–90 Days", minDays: 61, maxDays: 90 },
      { label: "Over 90 Days", minDays: 91, maxDays: Infinity },
    ];

    const totalARBalance = invoices.reduce((s, i) => s + Number(i.balanceDue), 0);
    const uniqueClients = new Set(invoices.map((i) => i.clientId).filter(Boolean));

    let overdue30PlusTotal = 0;

    const buckets = bucketsConfig.map((b) => {
      const filtered = invoices.filter((inv) => {
        if (!inv.dueDate) return b.label === "Current";
        const diff = Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / 86400000);
        return diff >= b.minDays && diff <= b.maxDays;
      });

      const bucketTotal = filtered.reduce((s, i) => s + Number(i.balanceDue), 0);
      if (b.minDays >= 31) {
        overdue30PlusTotal += bucketTotal;
      }

      return {
        bucket: b.label,
        count: filtered.length,
        totalAmount: Math.round(bucketTotal * 100) / 100,
        percentage: totalARBalance > 0 ? Math.round((bucketTotal / totalARBalance) * 1000) / 10 : 0,
      };
    });

    const netARBalance = Math.max(0, totalARBalance - unappliedCreditsTotal);
    const overdue30PlusRatio = totalARBalance > 0 ? Math.round((overdue30PlusTotal / totalARBalance) * 1000) / 10 : 0;

    const reconciliation = await this.getAgingReconciliation(organizationId, query);

    const executionTimeMs = Date.now() - startTime;
    const metadata = this.buildReportMetadata(organizationId, asOfDate, query, executionTimeMs, fiscalPeriodLabel);

    return {
      reportMetadata: metadata,
      kpis: {
        totalGrossAR: Math.round(totalARBalance * 100) / 100,
        unappliedCredits: Math.round(unappliedCreditsTotal * 100) / 100,
        netAROutstanding: Math.round(netARBalance * 100) / 100,
        openInvoicesCount: invoices.length,
        openCustomersCount: uniqueClients.size,
        overdue30PlusRatio,
      },
      buckets,
      reconciliationStatus: {
        isReconciled: reconciliation.reconciliation.isReconciled,
        subledgerBalance: reconciliation.reconciliation.subledgerBalance,
        glBalance: reconciliation.reconciliation.glBalance,
        variance: reconciliation.reconciliation.variance,
        status: reconciliation.reconciliation.status,
      },
    };
  }

  async getAgingCustomers(organizationId: number, query: any = {}) {
    const startTime = Date.now();
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || 25)));
    const search = (query.search || "").toLowerCase().trim();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: "receivable",
        status: { in: ["sent", "partially_paid", "overdue"] },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        clientId: true,
        clientName: true,
        balanceDue: true,
        dueDate: true,
      },
    });

    const customerMap = new Map<number, any>();

    for (const inv of invoices) {
      const cId = inv.clientId ?? 0;
      const cName = inv.clientName || `Customer #${cId}`;
      if (!customerMap.has(cId)) {
        customerMap.set(cId, {
          clientId: cId,
          clientName: cName,
          totalOutstanding: 0,
          openInvoicesCount: 0,
          current: 0,
          days1_30: 0,
          days31_60: 0,
          days61_90: 0,
          daysOver90: 0,
          oldestDueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : null,
          oldestDaysOverdue: 0,
        });
      }

      const entry = customerMap.get(cId);
      const bal = Number(inv.balanceDue);
      entry.totalOutstanding += bal;
      entry.openInvoicesCount += 1;

      const daysOverdue = inv.dueDate
        ? Math.max(0, Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / 86400000))
        : 0;

      if (daysOverdue > entry.oldestDaysOverdue) {
        entry.oldestDaysOverdue = daysOverdue;
        entry.oldestDueDate = inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : entry.oldestDueDate;
      }

      const bucket = this.getAgingBucket(daysOverdue);
      if (bucket === "Current") entry.current += bal;
      else if (bucket === "1–30 Days") entry.days1_30 += bal;
      else if (bucket === "31–60 Days") entry.days31_60 += bal;
      else if (bucket === "61–90 Days") entry.days61_90 += bal;
      else if (bucket === "Over 90 Days") entry.daysOver90 += bal;
    }

    let customerList = Array.from(customerMap.values());

    if (search) {
      customerList = customerList.filter((c) => c.clientName.toLowerCase().includes(search));
    }

    const sortBy = query.sortBy || "totalOutstanding";
    const sortOrder = query.sortOrder === "asc" ? 1 : -1;
    customerList.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return -1 * sortOrder;
      if (a[sortBy] > b[sortBy]) return 1 * sortOrder;
      return 0;
    });

    const totalRecords = customerList.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const paginated = customerList.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
      ...c,
      totalOutstanding: Math.round(c.totalOutstanding * 100) / 100,
      current: Math.round(c.current * 100) / 100,
      days1_30: Math.round(c.days1_30 * 100) / 100,
      days31_60: Math.round(c.days31_60 * 100) / 100,
      days61_90: Math.round(c.days61_90 * 100) / 100,
      daysOver90: Math.round(c.daysOver90 * 100) / 100,
    }));

    const executionTimeMs = Date.now() - startTime;
    const metadata = this.buildReportMetadata(organizationId, asOfDate, query, executionTimeMs);

    return {
      reportMetadata: metadata,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: paginated,
    };
  }

  async getAgingInvoices(organizationId: number, query: any = {}) {
    const startTime = Date.now();
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || 25)));
    const search = (query.search || "").toLowerCase().trim();

    const whereCondition: Prisma.InvoiceWhereInput = {
      organizationId,
      type: "receivable",
      status: { in: ["sent", "partially_paid", "overdue"] },
      balanceDue: { gt: 0 },
    };

    if (query.clientId) whereCondition.clientId = Number(query.clientId);
    if (query.invoiceNumber) whereCondition.invoiceNumber = { contains: query.invoiceNumber, mode: "insensitive" };
    if (query.status) {
      const statuses = query.status.split(",") as any[];
      whereCondition.status = { in: statuses };
    }

    if (search) {
      whereCondition.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { clientName: { contains: search, mode: "insensitive" } },
      ];
    }

    const invoices = await this.prisma.invoice.findMany({
      where: whereCondition,
      include: {
        payments: { where: { status: { in: ["cleared", "completed"] } }, select: { amount: true } },
        creditNotes: { where: { status: "issued" }, select: { amount: true } },
        debitNotes: { where: { status: "issued" }, select: { amount: true } },
      },
      orderBy: { dueDate: query.sortOrder === "desc" ? "desc" : "asc" },
    });

    let formatted = invoices.map((inv) => {
      const total = Number(inv.total);
      const paid = Number(inv.paidAmount);
      const creditNotesAmount = inv.creditNotes.reduce((s, c) => s + Number(c.amount), 0);
      const debitNotesAmount = inv.debitNotes.reduce((s, d) => s + Number(d.amount), 0);
      
      let balanceDue = Number(inv.balanceDue);
      let hasDiscrepancy = false;

      if (query.validate) {
        const calculatedBalance = Math.max(0, total - paid - creditNotesAmount + debitNotesAmount);
        if (Math.abs(calculatedBalance - balanceDue) > 0.01) {
          hasDiscrepancy = true;
          balanceDue = calculatedBalance;
        }
      }

      const daysOverdue = inv.dueDate
        ? Math.max(0, Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / 86400000))
        : 0;

      const bucket = this.getAgingBucket(daysOverdue);

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber ?? `INV-${inv.id}`,
        clientId: inv.clientId,
        clientName: inv.clientName ?? "N/A",
        issueDate: inv.issueDate ? inv.issueDate.toISOString().split("T")[0] : "",
        dueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : "",
        currency: "INR",
        exchangeRate: 1.0,
        originalTotal: Math.round(total * 100) / 100,
        originalBalanceDue: Math.round(balanceDue * 100) / 100,
        baseCurrencyTotal: Math.round(total * 100) / 100,
        baseCurrencyBalanceDue: Math.round(balanceDue * 100) / 100,
        paidAmount: Math.round(paid * 100) / 100,
        creditNotesAmount: Math.round(creditNotesAmount * 100) / 100,
        debitNotesAmount: Math.round(debitNotesAmount * 100) / 100,
        daysOverdue,
        bucket,
        status: inv.status,
        hasDiscrepancy,
      };
    });

    if (query.agingBucket && query.agingBucket !== "ALL") {
      const bucketFilterMap: Record<string, string> = {
        current: "Current",
        "1_30": "1–30 Days",
        "31_60": "31–60 Days",
        "61_90": "61–90 Days",
        over_90: "Over 90 Days",
      };
      const targetLabel = bucketFilterMap[query.agingBucket] || query.agingBucket;
      formatted = formatted.filter((i) => i.bucket === targetLabel);
    }

    const totalRecords = formatted.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const paginated = formatted.slice((page - 1) * pageSize, page * pageSize);

    const executionTimeMs = Date.now() - startTime;
    const metadata = this.buildReportMetadata(organizationId, asOfDate, query, executionTimeMs);

    return {
      reportMetadata: metadata,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        pageSize,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: paginated,
    };
  }

  async getAgingReconciliation(organizationId: number, query: any = {}) {
    const startTime = Date.now();
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        type: "receivable",
        status: { in: ["sent", "partially_paid", "overdue"] },
        balanceDue: { gt: 0 },
      },
      select: { balanceDue: true },
    });

    const subledgerGrossAR = openInvoices.reduce((s, i) => s + Number(i.balanceDue), 0);

    const unappliedPayments = await this.prisma.payment.findMany({
      where: {
        organizationId,
        invoiceId: null,
        status: { in: ["cleared", "completed"] },
      },
      select: { amount: true },
    });
    const unappliedCredits = unappliedPayments.reduce((s, p) => s + Number(p.amount), 0);
    const subledgerNetAR = Math.max(0, subledgerGrossAR - unappliedCredits);

    const arAccount = await this.prisma.account.findFirst({
      where: {
        organizationId,
        OR: [
          { code: { in: ["1100", "1200"] } },
          { type: "Asset", name: { contains: "Accounts Receivable", mode: "insensitive" } },
        ],
      },
    });

    let glBalance = 0;
    if (arAccount) {
      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: {
          organizationId,
          accountId: arAccount.id,
          entryDate: { lte: asOfDate },
        },
        select: { debit: true, credit: true },
      });
      glBalance = ledgerEntries.reduce((s, e) => s + Number(e.debit) - Number(e.credit), 0);
      if (ledgerEntries.length === 0 && Number(arAccount.balance) !== 0) {
        glBalance = Number(arAccount.balance);
      }
    } else {
      glBalance = subledgerNetAR; // fallback if chart of accounts not initialized
    }

    const variance = Math.round((subledgerNetAR - glBalance) * 100) / 100;
    const isReconciled = Math.abs(variance) < 0.01;

    const executionTimeMs = Date.now() - startTime;
    const metadata = this.buildReportMetadata(organizationId, asOfDate, query, executionTimeMs);

    return {
      reportMetadata: metadata,
      reconciliation: {
        subledgerGrossAR: Math.round(subledgerGrossAR * 100) / 100,
        unappliedCredits: Math.round(unappliedCredits * 100) / 100,
        subledgerBalance: Math.round(subledgerNetAR * 100) / 100,
        glBalance: Math.round(glBalance * 100) / 100,
        variance,
        isReconciled,
        status: isReconciled ? "RECONCILED" : "DISCREPANCY",
        arAccount: arAccount ? { id: arAccount.id, code: arAccount.code, name: arAccount.name } : null,
        varianceBreakdown: [
          { category: "Unposted Billing Drafts", amount: 0 },
          { category: "Timing & Date Posting Differences", amount: Math.abs(variance) },
          { category: "Direct GL Journal Adjustments", amount: 0 },
        ],
      },
    };
  }

  async getInvoiceDrilldownTimeline(organizationId: number, invoiceId: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        items: true,
        payments: { orderBy: { paymentDate: "asc" } },
        creditNotes: { orderBy: { issueDate: "asc" } },
        debitNotes: { orderBy: { issueDate: "asc" } },
        dunningRecords: { orderBy: { notifiedAt: "asc" } },
      },
    });

    if (!invoice) throw new Error("Invoice not found");

    const ledgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        organizationId,
        referenceType: "Invoice",
        referenceId: invoiceId,
      },
      include: { account: { select: { name: true, code: true } } },
      orderBy: { entryDate: "asc" },
    });

    const timeline: any[] = [];

    if (invoice.issueDate || invoice.createdAt) {
      timeline.push({
        id: `inv-created-${invoice.id}`,
        type: "INVOICE_CREATED",
        title: "Invoice Created & Issued",
        timestamp: (invoice.issueDate || invoice.createdAt).toISOString(),
        description: `Invoice ${invoice.invoiceNumber ?? `#${invoice.id}`} created for client ${invoice.clientName ?? "N/A"}`,
        amount: Number(invoice.total),
        badgeVariant: "default",
      });
    }

    for (const le of ledgerEntries) {
      timeline.push({
        id: `ledger-${le.id}`,
        type: "GL_POSTED",
        title: `Ledger Entry Posted (${le.account.code} - ${le.account.name})`,
        timestamp: le.entryDate.toISOString(),
        description: le.description || "Automated journal posting",
        debit: Number(le.debit),
        credit: Number(le.credit),
        badgeVariant: "secondary",
      });
    }

    for (const d of invoice.dunningRecords) {
      timeline.push({
        id: `dunning-${d.id}`,
        type: "DUNNING_NOTICE",
        title: `Dunning Reminder Level ${d.level} Sent`,
        timestamp: d.notifiedAt.toISOString(),
        description: `Overdue notification sent (${d.daysOverdue} days overdue)`,
        badgeVariant: "warning",
      });
    }

    for (const p of invoice.payments) {
      timeline.push({
        id: `payment-${p.id}`,
        type: "PAYMENT_RECEIVED",
        title: `Payment Received (${p.paymentMethod ?? "Bank Transfer"})`,
        timestamp: (p.paymentDate || p.createdAt).toISOString(),
        description: `Payment cleared. Ref: ${p.referenceId ?? "N/A"}`,
        amount: Number(p.amount),
        badgeVariant: "success",
      });
    }

    for (const cn of invoice.creditNotes) {
      timeline.push({
        id: `cn-${cn.id}`,
        type: "CREDIT_NOTE",
        title: `Credit Note Issued (${cn.creditNoteNumber ?? `#${cn.id}`})`,
        timestamp: (cn.issueDate || cn.createdAt).toISOString(),
        description: cn.reason || "Credit note adjustment",
        amount: Number(cn.amount),
        badgeVariant: "destructive",
      });
    }

    for (const dn of invoice.debitNotes) {
      timeline.push({
        id: `dn-${dn.id}`,
        type: "DEBIT_NOTE",
        title: `Debit Note Issued (${dn.debitNoteNumber ?? `#${dn.id}`})`,
        timestamp: (dn.issueDate || dn.createdAt).toISOString(),
        description: dn.reason || "Debit note adjustment",
        amount: Number(dn.amount),
        badgeVariant: "outline",
      });
    }

    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber ?? `INV-${invoice.id}`,
        clientName: invoice.clientName,
        issueDate: invoice.issueDate ? invoice.issueDate.toISOString().split("T")[0] : "",
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString().split("T")[0] : "",
        total: Number(invoice.total),
        paidAmount: Number(invoice.paidAmount),
        balanceDue: Number(invoice.balanceDue),
        status: invoice.status,
      },
      items: invoice.items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        amount: Number(it.amount),
      })),
      timeline,
    };
  }

  async exportAgingReport(organizationId: number, query: any = {}) {
    const view = query.view || "summary";
    const asOfDate = query.asOfDate ? new Date(query.asOfDate) : new Date();

    if (view === "customers") {
      const result = await this.getAgingCustomers(organizationId, { ...query, pageSize: 10000 });
      let csv = `Audit Metadata Header\nReport Title,Accounts Receivable Aging Report - Customer Wise\nReport Version,2.0-ERP\nOrganization ID,${organizationId}\nAs Of Date,${asOfDate.toISOString().split("T")[0]}\nGenerated At,${new Date().toISOString()}\nBase Currency,INR\n\n`;
      csv += `Customer ID,Customer Name,Total Outstanding,Current,1-30 Days,31-60 Days,61-90 Days,Over 90 Days,Open Invoices Count,Oldest Overdue Days\n`;
      for (const row of result.data) {
        csv += `"${row.clientId}","${row.clientName}",${row.totalOutstanding},${row.current},${row.days1_30},${row.days31_60},${row.days61_90},${row.daysOver90},${row.openInvoicesCount},${row.oldestDaysOverdue}\n`;
      }
      return csv;
    } else if (view === "invoices") {
      const result = await this.getAgingInvoices(organizationId, { ...query, pageSize: 10000 });
      let csv = `Audit Metadata Header\nReport Title,Accounts Receivable Aging Report - Invoice Wise\nReport Version,2.0-ERP\nOrganization ID,${organizationId}\nAs Of Date,${asOfDate.toISOString().split("T")[0]}\nGenerated At,${new Date().toISOString()}\nBase Currency,INR\n\n`;
      csv += `Invoice Number,Customer Name,Issue Date,Due Date,Days Overdue,Aging Bucket,Status,Original Total,Payments Applied,Credit Notes,Debit Notes,Net Balance Due\n`;
      for (const row of result.data) {
        csv += `"${row.invoiceNumber}","${row.clientName}",${row.issueDate},${row.dueDate},${row.daysOverdue},"${row.bucket}","${row.status}",${row.originalTotal},${row.paidAmount},${row.creditNotesAmount},${row.debitNotesAmount},${row.baseCurrencyBalanceDue}\n`;
      }
      return csv;
    } else {
      const summary = await this.getAgingSummary(organizationId, query);
      let csv = `Audit Metadata Header\nReport Title,Accounts Receivable Aging Summary Report\nReport Version,2.0-ERP\nOrganization ID,${organizationId}\nAs Of Date,${asOfDate.toISOString().split("T")[0]}\nGenerated At,${new Date().toISOString()}\nBase Currency,INR\n\n`;
      csv += `KPI Metrics\nTotal Gross AR,${summary.kpis.totalGrossAR}\nUnapplied Customer Credits,${summary.kpis.unappliedCredits}\nNet AR Outstanding,${summary.kpis.netAROutstanding}\nOpen Invoices Count,${summary.kpis.openInvoicesCount}\nOpen Customers Count,${summary.kpis.openCustomersCount}\nOverdue 30+ Days Ratio %,${summary.kpis.overdue30PlusRatio}%\n\n`;
      csv += `Aging Bucket Summary\nAging Bucket,Invoice Count,Total Balance,Share Percentage\n`;
      for (const b of summary.buckets) {
        csv += `"${b.bucket}",${b.count},${b.totalAmount},${b.percentage}%\n`;
      }
      return csv;
    }
  }

  async getAging(organizationId: number) {
    const summary = await this.getAgingSummary(organizationId);
    const invoicesResult = await this.getAgingInvoices(organizationId, { pageSize: 1000 });
    
    return {
      aging: summary.buckets.map((b) => ({
        bucket: b.bucket,
        count: b.count,
        total: b.totalAmount,
        invoices: invoicesResult.data
          .filter((i) => i.bucket === b.bucket)
          .map((i) => ({
            id: i.id,
            invoice_number: i.invoiceNumber,
            client_name: i.clientName,
            total: i.originalTotal,
            balance_due: i.baseCurrencyBalanceDue,
            due_date: i.dueDate,
            days_overdue: i.daysOverdue,
            status: i.status,
          })),
      })),
      kpis: summary.kpis,
      reconciliation: summary.reconciliationStatus,
    };
  }

  private computeCashFlow(
    organizationId: number,
    revenueByMonth: Record<string, number>,
    expenseByMonth: Record<string, number>,
    cogsByMonth: Record<string, number>,
    allMonths: string[],
    labelFn: (k: string) => string,
  ) {
    return allMonths.map((k) => {
      const rev = revenueByMonth[k] ?? 0;
      const cogs = cogsByMonth[k] ?? 0;
      const exp = expenseByMonth[k] ?? 0;
      const operatingCashInflow = rev;
      const operatingCashOutflow = cogs + exp;
      const netOperating = operatingCashInflow - operatingCashOutflow;
      return {
        month: labelFn(k),
        operating_activities: {
          cash_inflow: Math.round(operatingCashInflow),
          cash_outflow: Math.round(operatingCashOutflow),
          net_cash: Math.round(netOperating),
        },
        investing_activities: {
          cash_inflow: 0,
          cash_outflow: 0,
          net_cash: 0,
        },
        financing_activities: {
          cash_inflow: 0,
          cash_outflow: 0,
          net_cash: 0,
        },
        net_change_in_cash: Math.round(netOperating),
      };
    });
  }

  async getCashFlowStatement(organizationId: number, query: CashFlowQueryDto) {
    const start = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const mode = query.reportingMode || CashFlowReportingMode.DIRECT;

    // 1. Identify cash/bank accounts
    const accounts = await this.prisma.account.findMany({
      where: { organizationId },
    });

    const cashAccounts = accounts.filter(
      (a) =>
        a.code === "1001" ||
        (a.type === "Asset" && (
          a.name.toLowerCase().includes("cash") ||
          a.name.toLowerCase().includes("bank")
        ))
    );
    const cashAccountIds = cashAccounts.map((a) => a.id);
    const cashAccountIdsSet = new Set(cashAccountIds);

    if (cashAccounts.length === 0) {
      return {
        reportingPeriod: { startDate: start, endDate: end },
        reportingMode: mode,
        openingBalance: 0,
        operatingActivities: { title: "Operating Activities", netCash: 0, items: [] },
        investingActivities: { title: "Investing Activities", netCash: 0, items: [] },
        financingActivities: { title: "Financing Activities", netCash: 0, items: [] },
        netIncreaseDecrease: 0,
        closingCashBalance: 0,
        reconciliation: { glClosingCashBalance: 0, bankStatementEndingBalance: 0, difference: 0, reconcilingItems: [] },
        transactions: [],
      };
    }

    // 2. Compute opening cash balance
    // Get all ledger entries for cash accounts after start date
    const ledgerEntriesAfterStart = await this.prisma.ledgerEntry.findMany({
      where: {
        organizationId,
        accountId: { in: cashAccountIds },
        entryDate: { gte: start },
      },
    });

    const currentCashBalance = cashAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const totalDebitsAfterStart = ledgerEntriesAfterStart.reduce((sum, entry) => sum + Number(entry.debit), 0);
    const totalCreditsAfterStart = ledgerEntriesAfterStart.reduce((sum, entry) => sum + Number(entry.credit), 0);
    const openingBalance = currentCashBalance - totalDebitsAfterStart + totalCreditsAfterStart;

    // 3. Retrieve all ledger entries in the period
    const allPeriodLedgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        organizationId,
        entryDate: { gte: start, lte: end },
      },
      include: {
        account: true,
      },
    });

    // 4. Group by transaction
    // Use referenceType + referenceId if available, otherwise date + description
    const txGroups = new Map<string, any[]>();
    for (const entry of allPeriodLedgerEntries) {
      const key = (entry.referenceType && entry.referenceId)
        ? `${entry.referenceType}_${entry.referenceId}`
        : `${entry.entryDate.getTime()}_${entry.description}`;
      if (!txGroups.has(key)) {
        txGroups.set(key, []);
      }
      txGroups.get(key)!.push(entry);
    }

    // 5. Filter for cash-touching transactions and classify
    const cashTransactionsList: any[] = [];
    let opNet = 0;
    let invNet = 0;
    let finNet = 0;

    // Direct operating categories
    let customerReceipts = 0;
    let supplierPayments = 0;
    let employeePayments = 0;
    let operatingExpPayments = 0;
    let otherOpPayments = 0;

    const investingItemsMap = new Map<string, number>();
    const financingItemsMap = new Map<string, number>();

    const isInvestingAccount = (account: any) => {
      const name = account.name.toLowerCase();
      const subType = (account.subType || "").toLowerCase();
      return account.type === "Asset" && (
        subType.includes("fixed") ||
        subType.includes("investment") ||
        name.includes("equipment") ||
        name.includes("hardware") ||
        name.includes("property") ||
        name.includes("plant") ||
        name.includes("vehicle") ||
        name.includes("land") ||
        name.includes("building") ||
        name.includes("investment")
      );
    };

    const isFinancingAccount = (account: any) => {
      const name = account.name.toLowerCase();
      const subType = (account.subType || "").toLowerCase();
      return account.type === "Equity" || (
        account.type === "Liability" && (
          subType.includes("debt") ||
          subType.includes("loan") ||
          subType.includes("capital") ||
          name.includes("loan") ||
          name.includes("borrowing") ||
          name.includes("debt") ||
          name.includes("share capital") ||
          name.includes("dividend") ||
          name.includes("equity")
        )
      );
    };

    for (const group of txGroups.values()) {
      const cashEntries = group.filter((e) => cashAccountIdsSet.has(e.accountId));
      if (cashEntries.length === 0) continue; // Exclude non-cash journal entry!

      const nonCashEntries = group.filter((e) => !cashAccountIdsSet.has(e.accountId));
      const netCashChange = cashEntries.reduce((sum, e) => sum + Number(e.debit) - Number(e.credit), 0);
      if (netCashChange === 0) continue; // Net 0 cash flow impact

      // Primary entry details for drilldown
      const repEntry = cashEntries[0];

      // Classify based on non-cash entries
      let txClassification: "operating" | "investing" | "financing" = "operating";
      let counterAccountInfo = { id: 0, code: "Unclassified", name: "Unclassified" };

      if (nonCashEntries.length > 0) {
        let opPart = 0;
        let invPart = 0;
        let finPart = 0;

        for (const nc of nonCashEntries) {
          const partAmount = Number(nc.credit) - Number(nc.debit); // Positive represents cash inflow, negative outflow
          if (isInvestingAccount(nc.account)) {
            invPart += partAmount;
            investingItemsMap.set(nc.account.name, (investingItemsMap.get(nc.account.name) || 0) + partAmount);
          } else if (isFinancingAccount(nc.account)) {
            finPart += partAmount;
            financingItemsMap.set(nc.account.name, (financingItemsMap.get(nc.account.name) || 0) + partAmount);
          } else {
            opPart += partAmount;
            // Direct Operating Classification
            const code = nc.account.code;
            if (code === "1002" || nc.account.type === "Revenue") {
              customerReceipts += partAmount;
            } else if (code === "2001" || code === "1003") {
              supplierPayments += partAmount;
            } else if (code === "5001") {
              employeePayments += partAmount;
            } else if (nc.account.type === "Expense") {
              operatingExpPayments += partAmount;
            } else {
              otherOpPayments += partAmount;
            }
          }
        }

        opNet += opPart;
        invNet += invPart;
        finNet += finPart;

        const maxPart = Math.max(Math.abs(opPart), Math.abs(invPart), Math.abs(finPart));
        if (maxPart === Math.abs(invPart)) {
          txClassification = "investing";
        } else if (maxPart === Math.abs(finPart)) {
          txClassification = "financing";
        } else {
          txClassification = "operating";
        }

        const dominantNc = nonCashEntries.sort((a, b) => Math.abs(Number(b.credit) - Number(b.debit)) - Math.abs(Number(a.credit) - Number(a.debit)))[0];
        if (dominantNc) {
          counterAccountInfo = {
            id: dominantNc.account.id,
            code: dominantNc.account.code,
            name: dominantNc.account.name,
          };
        }
      } else {
        if (repEntry.referenceType === "Expense") {
          operatingExpPayments += netCashChange;
          opNet += netCashChange;
          txClassification = "operating";
        } else if (repEntry.referenceType === "Payment") {
          customerReceipts += netCashChange;
          opNet += netCashChange;
          txClassification = "operating";
        } else {
          otherOpPayments += netCashChange;
          opNet += netCashChange;
          txClassification = "operating";
        }
      }

      cashTransactionsList.push({
        id: repEntry.id,
        date: repEntry.entryDate,
        description: repEntry.description,
        amount: netCashChange,
        activity: txClassification,
        type: netCashChange > 0 ? "inflow" : "outflow",
        counterAccount: counterAccountInfo,
        referenceType: repEntry.referenceType,
        referenceId: repEntry.referenceId,
      });
    }

    // 6. Operating Activities - Indirect Method
    const accrualRevenue = allPeriodLedgerEntries
      .filter((e) => e.account.type === "Revenue")
      .reduce((sum, e) => sum + Number(e.credit) - Number(e.debit), 0);
    const accrualExpense = allPeriodLedgerEntries
      .filter((e) => e.account.type === "Expense")
      .reduce((sum, e) => sum + Number(e.debit) - Number(e.credit), 0);
    const netIncome = accrualRevenue - accrualExpense;

    const nonCashExpensesList = allPeriodLedgerEntries.filter((e) => {
      if (e.account.type !== "Expense") return false;
      const key = (e.referenceType && e.referenceId)
        ? `${e.referenceType}_${e.referenceId}`
        : `${e.entryDate.getTime()}_${e.description}`;
      const group = txGroups.get(key) || [];
      return !group.some((ge) => cashAccountIdsSet.has(ge.accountId));
    });
    const nonCashExpenses = nonCashExpensesList.reduce((sum, e) => sum + Number(e.debit) - Number(e.credit), 0);

    const arAccounts = accounts.filter((a) => a.code === "1002");
    let arChange = 0;
    if (arAccounts.length > 0) {
      const arIds = arAccounts.map((a) => a.id);
      const arEntriesAfterStart = await this.prisma.ledgerEntry.findMany({
        where: { organizationId, accountId: { in: arIds }, entryDate: { gte: start } },
      });
      const currentAr = arAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const arDebitsAfterStart = arEntriesAfterStart.reduce((sum, e) => sum + Number(e.debit), 0);
      const arCreditsAfterStart = arEntriesAfterStart.reduce((sum, e) => sum + Number(e.credit), 0);
      const arOpening = currentAr - arDebitsAfterStart + arCreditsAfterStart;

      const arEntriesInPeriod = allPeriodLedgerEntries.filter((e) => arIds.includes(e.accountId));
      const arDebitsPeriod = arEntriesInPeriod.reduce((sum, e) => sum + Number(e.debit), 0);
      const arCreditsPeriod = arEntriesInPeriod.reduce((sum, e) => sum + Number(e.credit), 0);
      const arClosing = arOpening + arDebitsPeriod - arCreditsPeriod;
      arChange = arOpening - arClosing;
    }

    const invAccounts = accounts.filter((a) => a.code === "1003");
    let invChange = 0;
    if (invAccounts.length > 0) {
      const invIds = invAccounts.map((a) => a.id);
      const invEntriesAfterStart = await this.prisma.ledgerEntry.findMany({
        where: { organizationId, accountId: { in: invIds }, entryDate: { gte: start } },
      });
      const currentInv = invAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const invDebitsAfterStart = invEntriesAfterStart.reduce((sum, e) => sum + Number(e.debit), 0);
      const invCreditsAfterStart = invEntriesAfterStart.reduce((sum, e) => sum + Number(e.credit), 0);
      const invOpening = currentInv - invDebitsAfterStart + invCreditsAfterStart;

      const invEntriesInPeriod = allPeriodLedgerEntries.filter((e) => invIds.includes(e.accountId));
      const invDebitsPeriod = invEntriesInPeriod.reduce((sum, e) => sum + Number(e.debit), 0);
      const invCreditsPeriod = invEntriesInPeriod.reduce((sum, e) => sum + Number(e.credit), 0);
      const invClosing = invOpening + invDebitsPeriod - invCreditsPeriod;
      invChange = invOpening - invClosing;
    }

    const apAccounts = accounts.filter((a) => a.code === "2001");
    let apChange = 0;
    if (apAccounts.length > 0) {
      const apIds = apAccounts.map((a) => a.id);
      const apEntriesAfterStart = await this.prisma.ledgerEntry.findMany({
        where: { organizationId, accountId: { in: apIds }, entryDate: { gte: start } },
      });
      const currentAp = apAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
      const apDebitsAfterStart = apEntriesAfterStart.reduce((sum, e) => sum + Number(e.debit), 0);
      const apCreditsAfterStart = apEntriesAfterStart.reduce((sum, e) => sum + Number(e.credit), 0);
      const apOpening = currentAp - apCreditsAfterStart + apDebitsAfterStart;

      const apEntriesInPeriod = allPeriodLedgerEntries.filter((e) => apIds.includes(e.accountId));
      const apDebitsPeriod = apEntriesInPeriod.reduce((sum, e) => sum + Number(e.debit), 0);
      const apCreditsPeriod = apEntriesInPeriod.reduce((sum, e) => sum + Number(e.credit), 0);
      const apClosing = apOpening + apCreditsPeriod - apDebitsPeriod;
      apChange = apClosing - apOpening;
    }

    let operatingItems: any[] = [];
    if (mode === CashFlowReportingMode.DIRECT) {
      operatingItems = [
        { label: "Cash Receipts from Customers", amount: customerReceipts },
        { label: "Cash Paid to Suppliers / Vendors", amount: supplierPayments },
        { label: "Cash Paid to Employees", amount: employeePayments },
        { label: "Cash Paid for Operating Expenses", amount: operatingExpPayments },
        { label: "Other Operating Cash Flows", amount: otherOpPayments },
      ];
    } else {
      operatingItems = [
        { label: "Net Income (Accrual)", amount: netIncome },
        { label: "Adjustments for Non-Cash Expenses", amount: nonCashExpenses },
        { label: "Decrease (Increase) in Accounts Receivable", amount: arChange },
        { label: "Decrease (Increase) in Inventory", amount: invChange },
        { label: "Increase (Decrease) in Accounts Payable", amount: apChange },
      ];
    }

    const investingItems: any[] = [];
    for (const [label, amount] of investingItemsMap.entries()) {
      investingItems.push({ label: `Purchase/Sale of ${label}`, amount });
    }
    if (investingItems.length === 0) {
      investingItems.push({ label: "Purchase/Sale of Fixed Assets", amount: 0 });
    }

    const financingItems: any[] = [];
    for (const [label, amount] of financingItemsMap.entries()) {
      financingItems.push({ label: `Proceeds/Repayment of ${label}`, amount });
    }
    if (financingItems.length === 0) {
      financingItems.push({ label: "Proceeds/Repayment of Loans & Capital", amount: 0 });
    }

    // 7. Bank Reconciliation
    const unmatchedLedgerEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        accountId: { in: cashAccountIds },
        entryDate: { gte: start, lte: end },
        bankMatches: { none: {} },
      },
    });

    const depositsInTransit = unmatchedLedgerEntries
      .filter((e) => Number(e.debit) > 0)
      .reduce((sum, e) => sum + Number(e.debit), 0);

    const outstandingPayments = unmatchedLedgerEntries
      .filter((e) => Number(e.credit) > 0)
      .reduce((sum, e) => sum + Number(e.credit), 0);

    const unmatchedBankTransactions = await this.prisma.bankTransaction.findMany({
      where: {
        organizationId,
        transactionDate: { gte: start, lte: end },
        classification: "Unmatched",
      },
    });

    const unrecordedBankMovements = unmatchedBankTransactions.reduce((sum, t) => sum + Number(t.credit) - Number(t.debit), 0);

    const latestBankTx = await this.prisma.bankTransaction.findFirst({
      where: {
        organizationId,
        transactionDate: { gte: start, lte: end },
      },
      orderBy: { transactionDate: "desc" },
    });

    const closingCashBalance = openingBalance + opNet + invNet + finNet;
    const bankStatementEndingBalance = latestBankTx ? Number(latestBankTx.balance) : closingCashBalance;

    const difference = closingCashBalance - bankStatementEndingBalance;

    const reconciliation = {
      glClosingCashBalance: closingCashBalance,
      bankStatementEndingBalance,
      difference,
      reconcilingItems: [
        { type: "deposits_in_transit", label: "Deposits in Transit (GL Unmatched Inflows)", amount: depositsInTransit },
        { type: "outstanding_payments", label: "Outstanding Payments (GL Unmatched Outflows)", amount: outstandingPayments },
        { type: "unrecorded_movements", label: "Unrecorded Bank Movements (Bank Unmatched)", amount: unrecordedBankMovements },
      ],
    };

    return {
      reportingPeriod: { startDate: start, endDate: end },
      reportingMode: mode,
      openingBalance,
      operatingActivities: {
        title: "Operating Activities",
        netCash: opNet,
        items: operatingItems,
      },
      investingActivities: {
        title: "Investing Activities",
        netCash: invNet,
        items: investingItems,
      },
      financingActivities: {
        title: "Financing Activities",
        netCash: finNet,
        items: financingItems,
      },
      netIncreaseDecrease: opNet + invNet + finNet,
      closingCashBalance,
      reconciliation,
      transactions: cashTransactionsList.sort((a, b) => b.date.getTime() - a.date.getTime()),
    };
  }
}

