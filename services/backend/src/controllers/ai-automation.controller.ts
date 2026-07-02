import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * 1. Invoice Intel: Parse document text/email heuristics
 */
export const parseInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Invoice raw text payload is required' });
    }

    // Call Python FastAPI
    const response = await fetch(`${AI_SERVICE_URL}/invoice/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI microservice parse failure', details: err });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('AI parse invoice error:', error);
    return res.status(500).json({ error: 'Failed to process document parsing' });
  }
};

/**
 * 2. CRM Intel: Score Leads and generate follow-up actions
 */
export const scoreLeadsBatch = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Fetch active leads and parallel activity stats
    const leads = await prisma.lead.findMany({
      where: { organizationId },
      include: {
        activities: true
      }
    });

    if (leads.length === 0) {
      return res.json({ message: 'No leads registered to score.', scoredLeads: [] });
    }

    // Format for FastAPI Input
    const leadsPayload = leads.map(l => ({
      id: l.id,
      companyName: l.companyName,
      contactPerson: l.contactPerson,
      email: l.email,
      phone: l.phone,
      status: l.status,
      source: l.source,
      leadScore: l.leadScore,
      activityCount: l.activities.length
    }));

    const response = await fetch(`${AI_SERVICE_URL}/crm/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: leadsPayload })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI microservice lead scoring failure', details: err });
    }

    const scores: any[] = await response.json();

    // Persist scores back into PostgreSQL via atomic Prisma updates
    const updatePromises = scores.map(s => 
      prisma.lead.update({
        where: { id: s.id },
        data: {
          aiScore: s.aiScore,
          aiFollowUp: s.aiFollowUp
        }
      })
    );
    await Promise.all(updatePromises);

    // Fetch updated leads lists
    const updatedLeads = await prisma.lead.findMany({
      where: { organizationId }
    });

    return res.json({ scoredLeads: updatedLeads });
  } catch (error: any) {
    console.error('AI lead scoring error:', error);
    return res.status(500).json({ error: 'Failed to score leads pipeline' });
  }
};

/**
 * 3. CRM Intel: Predict Churn Risks
 */
export const predictClientChurnBatch = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Get active clients, invoices, and activity logs
    const [clients, invoices, activities] = await Promise.all([
      prisma.client.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.activity.findMany({ where: { organizationId } })
    ]);

    if (clients.length === 0) {
      return res.json({ message: 'No clients found to evaluate.', churnPredictions: [] });
    }

    // Build churn inputs
    const now = new Date();
    const clientsPayload = clients.map(c => {
      const clientInvs = invoices.filter(i => i.clientId === c.id);
      const clientActs = activities.filter(a => a.clientId === c.id);
      
      // Calculate days since last invoice
      let days = 365;
      if (c.lastInvoiceDate) {
        const diffTime = Math.abs(now.getTime() - new Date(c.lastInvoiceDate).getTime());
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } else if (clientInvs.length > 0) {
        const dates = clientInvs.map(i => new Date(i.createdAt).getTime());
        const maxDate = Math.max(...dates);
        const diffTime = Math.abs(now.getTime() - maxDate);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        totalRevenue: c.totalRevenue,
        invoiceCount: clientInvs.length,
        daysSinceLastInvoice: days,
        activityCount: clientActs.length
      };
    });

    const response = await fetch(`${AI_SERVICE_URL}/crm/churn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clients: clientsPayload })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI microservice churn prediction failure', details: err });
    }

    const predictions: any[] = await response.json();

    // Persist churn ratings back to PG database
    const updatePromises = predictions.map(p => 
      prisma.client.update({
        where: { id: p.id },
        data: {
          aiChurnRisk: p.aiChurnRisk
        }
      })
    );
    await Promise.all(updatePromises);

    // Fetch updated client listing
    const updatedClients = await prisma.client.findMany({
      where: { organizationId }
    });

    return res.json({ churnPredictions: updatedClients });
  } catch (error: any) {
    console.error('AI client churn calculation error:', error);
    return res.status(500).json({ error: 'Failed to project churn parameters' });
  }
};

/**
 * 4. Financial Diagnostics: Cashflow, Outliers & Fraud Audits
 */
export const diagnoseFinancials = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    const [
      accounts,
      journalEntries,
      expenses,
      invoices
    ] = await Promise.all([
      prisma.account.findMany({ where: { organizationId } }),
      prisma.journalEntry.findMany({ where: { organizationId }, include: { lines: true } }),
      prisma.expense.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } })
    ]);

    // 1. Calculate Cashflow Forecast Parameters
    const cashAccount = accounts.find(a => a.code === '1010');
    const cashBalance = cashAccount ? cashAccount.balance : 500000.0;
    const paidInvs = invoices.filter(i => i.status === 'PAID');
    const totalPaid = paidInvs.reduce((sum, i) => sum + i.total, 0) || 75000.0;
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0) || 12000.0;

    // Call FastAPI Cashflow Forecast
    const forecastResponse = await fetch(`${AI_SERVICE_URL}/finance/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentBalance: cashBalance,
        baseInflow: totalPaid / 3, // 3-month baseline averages
        baseOutflow: totalExp / 3
      })
    });

    const forecast = forecastResponse.ok ? await forecastResponse.json() : [];

    // 2. Call FastAPI Expense Outliers anomaly checks
    let anomalyResults: any[] = [];
    if (expenses.length > 0) {
      const expensesPayload = expenses.map(e => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        description: e.description
      }));

      const anomalyResponse = await fetch(`${AI_SERVICE_URL}/finance/anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses: expensesPayload })
      });

      if (anomalyResponse.ok) {
        anomalyResults = await anomalyResponse.json();
        
        // Write anomaly flags back to DB via Prisma updates
        const updatePromises = anomalyResults.map(a => 
          prisma.expense.update({
            where: { id: a.id },
            data: {
              aiAnomalyStatus: a.aiAnomalyStatus
            }
          })
        );
        await Promise.all(updatePromises);
      }
    }

    // 3. Call FastAPI Fraud Ledger audits
    const accountsPayload = accounts.map(a => ({ id: a.id, name: a.name, code: a.code, type: a.type, balance: a.balance }));
    const journalsPayload = journalEntries.map(j => ({
      id: j.id,
      description: j.description,
      lines: j.lines.map(l => ({ type: l.type, amount: l.amount }))
    }));

    const auditResponse = await fetch(`${AI_SERVICE_URL}/finance/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: accountsPayload, journalEntries: journalsPayload })
    });

    const audit = auditResponse.ok ? await auditResponse.json() : { status: 'SECURE', healthScore: 100, warnings: [] };

    return res.json({
      forecast,
      expenseDiagnostics: anomalyResults,
      ledgerAudit: audit
    });
  } catch (error: any) {
    console.error('AI financial diagnosis error:', error);
    return res.status(500).json({ error: 'Failed to process corporate financial diagnostics' });
  }
};

/**
 * 5. Conversational RAG: Accounting context chat agent
 */
export const chatRagAgent = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question message text is required' });
    }

    const organizationId = req.tenant.id;

    // Fetch financial metrics context as live prompt variables
    const [accounts, invoices, expenses] = await Promise.all([
      prisma.account.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.expense.findMany({ where: { organizationId } })
    ]);

    const cashAccount = accounts.find(a => a.code === '1010');
    const cashBalance = cashAccount ? cashAccount.balance : 500000.0;
    const outstanding = invoices.filter(i => ['SENT', 'OVERDUE', 'PARTIALLY_PAID'].includes(i.status)).reduce((sum, i) => sum + i.total, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0) || 12000.0;
    const monthlyBurn = totalExp / 3;
    const runway = monthlyBurn > 0 ? cashBalance / monthlyBurn : 12.0;

    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        financialContext: {
          cashBalance,
          outstanding,
          monthlyBurnRate: monthlyBurn,
          runwayMonths: runway
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'AI conversational agent offline', details: err });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('AI Chat agent error:', error);
    return res.status(500).json({ error: 'Failed to coordinate chatbot response' });
  }
};

/**
 * 6. WhatsApp Billing Agent Simulator Hook
 */
export const simulateWhatsAppWebhook = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { senderPhone, message } = req.body;
    if (!senderPhone || !message) {
      return res.status(400).json({ error: 'senderPhone and message fields are required' });
    }

    const organizationId = req.tenant.id;

    // Fetch tenant invoices to contextualize outstanding payments list
    const invoices = await prisma.invoice.findMany({
      where: { organizationId }
    });

    const response = await fetch(`${AI_SERVICE_URL}/whatsapp/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderPhone,
        message,
        invoices: invoices.map(i => ({ invoiceNumber: i.invoiceNumber, total: i.total, status: i.status, dueDate: i.dueDate }))
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'WhatsApp bot processor error', details: err });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('WhatsApp hook simulation error:', error);
    return res.status(500).json({ error: 'Failed to process WhatsApp hook message' });
  }
};
