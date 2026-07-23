import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { EventBusService } from "../event-bus/event-bus.service";
import { Events } from "../event-bus/event-types";

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
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
        type: a.type === "Revenue" ? "Income" : a.type,
        group: a.subType ?? "General",
        opening_balance: 0,
        current_balance: Number(a.balance),
        is_active: a.isActive,
      })),
    };
  }

  async getExpenses(organizationId: number) {
    const expenses = await this.prisma.expense.findMany({
      where: { organizationId },
      orderBy: { date: "desc" },
      include: {
        account: { select: { name: true } },
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
        paid_to: e.account.name,
        payment_method: e.paymentMethod ?? "",
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
          date: e.entryDate.toISOString().split("T")[0],
          account_id: e.accountId,
          account_name: e.account.name,
          description: e.description,
          voucher_type: e.referenceType ?? "Journal",
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

    const expense = await this.prisma.expense.create({
      data: {
        organizationId,
        accountId: account.id,
        amount: new Prisma.Decimal(body.amount ?? 0),
        category: body.category ?? null,
        description: body.description ?? null,
        date: body.date ? new Date(body.date) : new Date(),
        paymentMethod: body.payment_method ?? body.paymentMethod ?? null,
        reference: body.reference ?? null,
        status: body.status ?? "recorded",
      },
    });

    await this.prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: new Prisma.Decimal(body.amount ?? 0) } },
    });

    const cashBankAccount = await this.prisma.account.findFirst({
      where: { organizationId, code: "1001" },
    });
    if (cashBankAccount && account.id !== cashBankAccount.id) {
      await this.prisma.ledgerEntry.createMany({
        data: [
          {
            organizationId,
            accountId: account.id,
            entryDate: expense.date,
            description: `Expense: ${body.description ?? "Expense recorded"}`,
            debit: new Prisma.Decimal(body.amount ?? 0),
            credit: 0,
            referenceType: "Expense",
            referenceId: expense.id,
          },
          {
            organizationId,
            accountId: cashBankAccount.id,
            entryDate: expense.date,
            description: `Expense: ${body.description ?? "Expense recorded"}`,
            debit: 0,
            credit: new Prisma.Decimal(body.amount ?? 0),
            referenceType: "Expense",
            referenceId: expense.id,
          },
        ],
      });
    }

    this.eventBus.emit(Events.ExpenseCreated, {
      organizationId,
      expenseId: expense.id,
      amount: Number(body.amount ?? 0),
      category: body.category ?? "General",
      timestamp: new Date(),
    });

    return { id: expense.id, amount: Number(expense.amount), message: "Expense recorded" };
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

  async getAging(organizationId: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ["sent", "partially_paid", "overdue"] },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        total: true,
        balanceDue: true,
        dueDate: true,
        status: true,
      },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();
    const buckets = [
      { label: "Current", minDays: -Infinity, maxDays: 30 },
      { label: "31-60 Days", minDays: 31, maxDays: 60 },
      { label: "61-90 Days", minDays: 61, maxDays: 90 },
      { label: "90+ Days", minDays: 91, maxDays: Infinity },
    ];

    const aging = buckets.map((bucket) => {
      const filtered = invoices.filter((inv) => {
        if (!inv.dueDate) return false;
        const diff = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000);
        return diff >= bucket.minDays && diff <= bucket.maxDays;
      });

      return {
        bucket: bucket.label,
        min_days: bucket.minDays === -Infinity ? 0 : bucket.minDays,
        max_days: bucket.maxDays === Infinity ? null : bucket.maxDays,
        total: filtered.reduce((s, i) => s + Number(i.balanceDue), 0),
        count: filtered.length,
        invoices: filtered.map((i) => ({
          id: i.id,
          invoice_number: i.invoiceNumber ?? `INV-${i.id}`,
          client_name: i.clientName,
          total: Number(i.total),
          balance_due: Number(i.balanceDue),
          due_date: i.dueDate?.toISOString().split("T")[0] ?? "",
          days_overdue: i.dueDate ? Math.max(0, Math.floor((now.getTime() - i.dueDate.getTime()) / 86400000)) : 0,
          status: i.status,
        })),
      };
    });

    return { aging };
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
}
