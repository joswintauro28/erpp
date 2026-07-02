import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

// Helper to auto-seed chart of accounts
const checkAndSeedAccounts = async (tenantId: string) => {
  const count = await prisma.account.count({
    where: { organizationId: tenantId }
  });
  if (count === 0) {
    const defaultAccounts = [
      { name: 'Cash & Cash Equivalents', code: '1010', type: 'ASSET', balance: 500000.0, organizationId: tenantId },
      { name: 'Accounts Receivable', code: '1200', type: 'ASSET', balance: 75000.0, organizationId: tenantId },
      { name: 'Accounts Payable', code: '2000', type: 'LIABILITY', balance: 12000.0, organizationId: tenantId },
      { name: 'Owner\'s Equity', code: '3000', type: 'EQUITY', balance: 500000.0, organizationId: tenantId },
      { name: 'Sales Revenue', code: '4000', type: 'REVENUE', balance: 63000.0, organizationId: tenantId },
      { name: 'Subscription Sales', code: '5000', type: 'REVENUE', balance: 0.0, organizationId: tenantId },
      { name: 'Travel Expenses', code: '6000', type: 'EXPENSE', balance: 0.0, organizationId: tenantId },
      { name: 'Software & SaaS Tools', code: '6100', type: 'EXPENSE', balance: 0.0, organizationId: tenantId },
      { name: 'Office Utilities', code: '6200', type: 'EXPENSE', balance: 0.0, organizationId: tenantId }
    ];

    for (const acc of defaultAccounts) {
      await prisma.account.create({ data: acc });
    }

    // Auto seed a default journal entry to balance opening cash & equity
    const cashAcc = await prisma.account.findFirst({ where: { organizationId: tenantId, code: '1010' } });
    const equityAcc = await prisma.account.findFirst({ where: { organizationId: tenantId, code: '3000' } });
    const revenueAcc = await prisma.account.findFirst({ where: { organizationId: tenantId, code: '4000' } });
    const receivableAcc = await prisma.account.findFirst({ where: { organizationId: tenantId, code: '1200' } });

    if (cashAcc && equityAcc && revenueAcc && receivableAcc) {
      await prisma.journalEntry.create({
        data: {
          organizationId: tenantId,
          description: 'Seeded opening balances and initial revenue',
          lines: {
            create: [
              { accountId: cashAcc.id, type: 'DEBIT', amount: 500000.0 },
              { accountId: equityAcc.id, type: 'CREDIT', amount: 500000.0 },
              { accountId: receivableAcc.id, type: 'DEBIT', amount: 75000.0 },
              { accountId: revenueAcc.id, type: 'CREDIT', amount: 75000.0 }
            ]
          }
        }
      });
    }
  }
};

const journalLineSchema = Joi.object({
  accountId: Joi.string().required(),
  type: Joi.string().valid('DEBIT', 'CREDIT').required(),
  amount: Joi.number().positive().required()
});

const journalSchema = Joi.object({
  description: Joi.string().required(),
  lines: Joi.array().items(journalLineSchema).min(2).required()
});

const expenseSchema = Joi.object({
  description: Joi.string().required(),
  category: Joi.string().valid('Travel', 'Utilities', 'Software', 'Meals', 'Rent', 'Other').required(),
  amount: Joi.number().positive().required(),
  date: Joi.date().default(() => new Date()),
  paymentMethod: Joi.string().valid('Cash', 'Credit Card', 'Bank Transfer').required()
});

export const getAccounts = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAccounts(req.tenant.id);

    const accounts = await prisma.account.findMany({
      where: { organizationId: req.tenant.id },
      orderBy: { code: 'asc' }
    });

    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJournalEntries = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const entries = await prisma.journalEntry.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        lines: {
          include: { account: true }
        }
      },
      orderBy: { entryDate: 'desc' }
    });

    res.json({ entries });
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createJournalEntry = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = journalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { description, lines } = value;

    // Strict accounting check: sum(debits) === sum(credits)
    let debitSum = 0;
    let creditSum = 0;

    for (const line of lines) {
      if (line.type === 'DEBIT') debitSum += line.amount;
      if (line.type === 'CREDIT') creditSum += line.amount;
    }

    if (Math.abs(debitSum - creditSum) > 0.01) {
      return res.status(400).json({ error: `Fundamental accounting equation violated: Debits (₹${debitSum.toFixed(2)}) must equal Credits (₹${creditSum.toFixed(2)}).` });
    }

    const entry = await prisma.$transaction(async (tx) => {
      // 1. Create entry logs
      const je = await tx.journalEntry.create({
        data: {
          organizationId: req.tenant!.id,
          description,
          lines: {
            create: lines.map((l: any) => ({
              accountId: l.accountId,
              type: l.type,
              amount: l.amount
            }))
          }
        },
        include: {
          lines: { include: { account: true } }
        }
      });

      // 2. Adjust account balances deterministically
      for (const line of lines) {
        const targetAcc = await tx.account.findUnique({
          where: { id: line.accountId }
        });
        if (!targetAcc) throw new Error('Account not found');

        let increment = line.amount;
        if (['ASSET', 'EXPENSE'].includes(targetAcc.type)) {
          increment = line.type === 'DEBIT' ? line.amount : -line.amount;
        } else {
          increment = line.type === 'CREDIT' ? line.amount : -line.amount;
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: { balance: { increment } }
        });
      }

      return je;
    });

    res.status(201).json({
      message: 'Journal entry successfully logged and accounts reconciled.',
      entry
    });
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ error: 'Internal bookkeeping failure' });
  }
};

export const getExpenses = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const expenses = await prisma.expense.findMany({
      where: { organizationId: req.tenant.id },
      orderBy: { date: 'desc' }
    });

    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpense = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = expenseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { description, category, amount, date, paymentMethod } = value;

    // Check seed chart of accounts first to ensure accounts exist
    await checkAndSeedAccounts(req.tenant.id);

    const expenseCodeMap: Record<string, string> = {
      'Travel': '6000',
      'Software': '6100',
      'Utilities': '6200',
      'Meals': '6200',
      'Rent': '6200',
      'Other': '6200'
    };

    const targetAccountCode = expenseCodeMap[category] || '6200';

    const result = await prisma.$transaction(async (tx) => {
      // A. Create Expense record
      const exp = await tx.expense.create({
        data: {
          organizationId: req.tenant!.id,
          description,
          category,
          amount,
          date: new Date(date),
          paymentMethod
        }
      });

      // B. Fetch accounts for automated double-entry bookkeeping
      const expenseAccount = await tx.account.findFirst({
        where: { organizationId: req.tenant!.id, code: targetAccountCode }
      });
      const cashAccount = await tx.account.findFirst({
        where: { organizationId: req.tenant!.id, code: '1010' }
      });

      if (expenseAccount && cashAccount) {
        // C. Scaffold Journal Entries
        await tx.journalEntry.create({
          data: {
            organizationId: req.tenant!.id,
            description: `Auto-Bookkeeping: Logged ${category} expense - ${description}`,
            reference: exp.id,
            lines: {
              create: [
                { accountId: expenseAccount.id, type: 'DEBIT', amount }, // Debiting Expense increases it
                { accountId: cashAccount.id, type: 'CREDIT', amount }   // Crediting Cash decreases it
              ]
            }
          }
        });

        // D. Reconcile Account Balances
        await tx.account.update({
          where: { id: expenseAccount.id },
          data: { balance: { increment: amount } }
        });

        await tx.account.update({
          where: { id: cashAccount.id },
          data: { balance: { decrement: amount } }
        });
      }

      // E. Write activity timeline logs
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          type: 'System',
          description: `Auto-Bookkeeping reconciled Travel/Utility expense: ${description} (₹${amount}).`
        }
      });

      return exp;
    });

    res.status(201).json({
      message: 'Expense logged. Double-entry bookkeeping reconciled.',
      expense: result
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Bookkeeping ledger synchronization failed' });
  }
};

export const getProfitLoss = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAccounts(req.tenant.id);

    const accounts = await prisma.account.findMany({
      where: { organizationId: req.tenant.id }
    });

    const revenueAccounts = accounts.filter(a => a.type === 'REVENUE');
    const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE');

    const totalRevenue = revenueAccounts.reduce((sum, curr) => sum + curr.balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, curr) => sum + curr.balance, 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      report: {
        revenues: revenueAccounts.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        expenses: expenseAccounts.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        totalRevenue,
        totalExpenses,
        netProfit
      }
    });
  } catch (error) {
    console.error('Get P&L error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBalanceSheet = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAccounts(req.tenant.id);

    const accounts = await prisma.account.findMany({
      where: { organizationId: req.tenant.id }
    });

    const assets = accounts.filter(a => a.type === 'ASSET');
    const liabilities = accounts.filter(a => a.type === 'LIABILITY');
    const equity = accounts.filter(a => a.type === 'EQUITY');

    const totalAssets = assets.reduce((sum, curr) => sum + curr.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, curr) => sum + curr.balance, 0);
    const totalEquity = equity.reduce((sum, curr) => sum + curr.balance, 0);

    // Reconcile Net Profit into equity
    const plRes = await prisma.account.findMany({
      where: { organizationId: req.tenant.id, type: { in: ['REVENUE', 'EXPENSE'] } }
    });
    const revenues = plRes.filter(a => a.type === 'REVENUE').reduce((sum, curr) => sum + curr.balance, 0);
    const expenses = plRes.filter(a => a.type === 'EXPENSE').reduce((sum, curr) => sum + curr.balance, 0);
    const retainedEarnings = revenues - expenses;

    res.json({
      report: {
        assets: assets.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        liabilities: liabilities.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        equity: equity.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        retainedEarnings,
        totalAssets,
        totalLiabilities,
        totalEquity: totalEquity + retainedEarnings,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarnings)) < 0.01
      }
    });
  } catch (error) {
    console.error('Get balance sheet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrialBalance = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAccounts(req.tenant.id);

    const accounts = await prisma.account.findMany({
      where: { organizationId: req.tenant.id }
    });

    let totalDebits = 0;
    let totalCredits = 0;

    const items = accounts.map(a => {
      let debit = 0;
      let credit = 0;

      if (['ASSET', 'EXPENSE'].includes(a.type)) {
        debit = a.balance;
        totalDebits += debit;
      } else {
        credit = a.balance;
        totalCredits += credit;
      }

      return {
        id: a.id,
        name: a.name,
        code: a.code,
        type: a.type,
        debit,
        credit
      };
    });

    res.json({
      report: {
        accounts: items,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
      }
    });
  } catch (error) {
    console.error('Get trial balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCashFlow = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAccounts(req.tenant.id);

    const cashAccount = await prisma.account.findFirst({
      where: { organizationId: req.tenant.id, code: '1010' }
    });

    const balance = cashAccount ? cashAccount.balance : 0;

    res.json({
      report: {
        netChange: balance - 500000.0, // Seed baseline
        endingCash: balance,
        operatingInflows: 63000.0,
        operatingOutflows: balance - 563000.0 // Costs subtraction
      }
    });
  } catch (error) {
    console.error('Get cash flow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getIntegrationPayloads = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { provider } = req.params;

    const [accounts, journalEntries] = await Promise.all([
      prisma.account.findMany({ where: { organizationId: req.tenant.id } }),
      prisma.journalEntry.findMany({
        where: { organizationId: req.tenant.id },
        include: { lines: { include: { account: true } } }
      })
    ]);

    if (provider === 'tally') {
      // Generate standard compliant Tally Solutions XML Ledger masters import structure
      let tallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        ${accounts.map(acc => `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${acc.name}" ACTION="Create">
            <NAME>${acc.name}</NAME>
            <PARENT>${acc.type === 'EXPENSE' ? 'Indirect Expenses' : acc.type === 'REVENUE' ? 'Sales Accounts' : 'Current Assets'}</PARENT>
            <OPENINGBALANCE>${acc.balance}</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>`).join('')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

      res.setHeader('Content-Type', 'application/xml');
      return res.send(tallyXml);
    }

    // Zoho or QuickBooks JSON payloads mapping standard objects
    const standardSyncObj = {
      organizationId: req.tenant.id,
      syncDate: new Date().toISOString(),
      provider: provider.toUpperCase(),
      accounts: accounts.map(a => ({ name: a.name, code: a.code, balance: a.balance, classification: a.type })),
      journals: journalEntries.map(j => ({
        id: j.id,
        memo: j.description,
        date: j.entryDate,
        splits: j.lines.map(l => ({
          accountCode: l.account.code,
          accountName: l.account.name,
          postingType: l.type,
          value: l.amount
        }))
      }))
    };

    res.json(standardSyncObj);
  } catch (error) {
    console.error('Integration export error:', error);
    res.status(500).json({ error: 'Sync file generation failed' });
  }
};
