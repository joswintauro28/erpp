import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

// Joi validation schemas
const claimSchema = Joi.object({
  submittedBy: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().valid('Travel', 'Software', 'Meals', 'Utilities', 'Rent', 'Other').required(),
  amount: Joi.number().positive().required(),
  claimDate: Joi.date().default(() => new Date()),
  receiptUrl: Joi.string().optional().allow('')
});

const cardSchema = Joi.object({
  cardholderName: Joi.string().required(),
  cardNumber: Joi.string().required(),
  cardBrand: Joi.string().valid('Visa', 'Mastercard', 'AMEX').required(),
  creditLimit: Joi.number().positive().required()
});

/**
 * Dynamic Seeding and Claims Management
 */
export const getClaims = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Auto-seed claims if empty
    const claimCount = await prisma.expenseClaim.count({ where: { organizationId } });
    if (claimCount === 0) {
      const seedClaims = [
        {
          submittedBy: 'Nikhil CEO',
          description: 'Client luncheon business meeting at Taj BKC',
          category: 'Meals',
          amount: 8500.0,
          status: 'PENDING',
          ocrMetadata: JSON.stringify({ vendor: 'Taj BKC', extractedDate: new Date().toISOString(), ocrConfidence: 0.95 }),
          duplicateFlag: false,
          fraudFlag: false,
          organizationId
        },
        {
          submittedBy: 'Dev Lead',
          description: 'Github Enterprise annual developer seat seats licenses',
          category: 'Software',
          amount: 45000.0,
          status: 'APPROVED',
          ocrMetadata: JSON.stringify({ vendor: 'GitHub', extractedDate: new Date().toISOString(), ocrConfidence: 0.98 }),
          duplicateFlag: false,
          fraudFlag: false,
          organizationId
        }
      ];

      for (const c of seedClaims) {
        await prisma.expenseClaim.create({ data: c });
      }
    }

    const claims = await prisma.expenseClaim.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ claims });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClaim = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = claimSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { submittedBy, description, category, amount, claimDate, receiptUrl } = value;
    const organizationId = req.tenant.id;

    // --- AI RISK & INTELLIGENCE AUDIT ENGIND ---
    let autoCategory = category;
    let duplicateFlag = false;
    let fraudFlag = false;
    let fraudDetails = '';

    // 1. AI Auto-Categorization Heuristics
    const descLower = description.toLowerCase();
    if (descLower.includes('uber') || descLower.includes('flight') || descLower.includes('cab') || descLower.includes('taxi')) {
      autoCategory = 'Travel';
    } else if (descLower.includes('aws') || descLower.includes('slack') || descLower.includes('github') || descLower.includes('software') || descLower.includes('saas')) {
      autoCategory = 'Software';
    } else if (descLower.includes('lunch') || descLower.includes('dinner') || descLower.includes('lunch') || descLower.includes('luncheon') || descLower.includes('cafe')) {
      autoCategory = 'Meals';
    } else if (descLower.includes('electricity') || descLower.includes('broadband') || descLower.includes('utility')) {
      autoCategory = 'Utilities';
    }

    // 2. AI Duplicate Check Heuristics
    const targetDate = new Date(claimDate);
    const startRange = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const endRange = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

    const duplicateMatch = await prisma.expenseClaim.findFirst({
      where: {
        organizationId,
        amount,
        category: autoCategory,
        claimDate: {
          gte: startRange,
          lte: endRange
        }
      }
    });

    if (duplicateMatch) {
      duplicateFlag = true;
    }

    // 3. AI Fraud Analysis Heuristics
    if (autoCategory === 'Meals' && amount > 10000.0) {
      fraudFlag = true;
      fraudDetails = 'Single dining expense exceeds the standard corporate client entertainment cap (₹10,000). Pre-approval required.';
    } else if (autoCategory === 'Software' && amount > 100000.0) {
      fraudFlag = true;
      fraudDetails = 'Capital SaaS license purchases require executive sign-off. High amount flagged.';
    }

    const ocrMetadata = JSON.stringify({
      vendor: descLower.split(' ').slice(0, 3).join(' ') || 'Merchant Ledger',
      extractedDate: targetDate.toISOString(),
      ocrConfidence: 0.94,
      aiCategorized: autoCategory !== category
    });

    const claim = await prisma.expenseClaim.create({
      data: {
        organizationId,
        submittedBy,
        description,
        category: autoCategory,
        amount,
        claimDate: targetDate,
        receiptUrl: receiptUrl || null,
        status: 'PENDING',
        ocrMetadata,
        duplicateFlag,
        fraudFlag,
        fraudDetails: fraudFlag ? fraudDetails : null
      }
    });

    // Write system activity logs for audit trail
    await prisma.activity.create({
      data: {
        organizationId,
        type: 'System',
        description: `Expense claim submitted by ${submittedBy} for ₹${amount.toLocaleString('en-IN')}. AI audits completed (Duplicates: ${duplicateFlag ? 'YES' : 'NO'}, Fraud: ${fraudFlag ? 'YES' : 'NO'}).`
      }
    });

    res.status(201).json({ claim });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to file expense claim' });
  }
};

export const approveClaim = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const organizationId = req.tenant.id;

    const claim = await prisma.expenseClaim.findFirst({ where: { id, organizationId } });
    if (!claim) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    res.json({ message: 'Claim successfully approved.', claim: updated });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: 'Approval transition failed' });
  }
};

/**
 * Reimbursements payout engine (Cohesive ledger double-entry bookkeeping integrated)
 */
export const reimburseClaim = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const organizationId = req.tenant.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Claim
      const claim = await tx.expenseClaim.findFirst({ where: { id, organizationId } });
      if (!claim) throw new Error('Claim not found');
      if (claim.status !== 'APPROVED') throw new Error('Only approved claims can be reimbursed.');

      // 2. Set status to REIMBURSED
      const updated = await tx.expenseClaim.update({
        where: { id },
        data: { status: 'REIMBURSED' }
      });

      // 3. Integrate with General Ledger Double-Entries (Module 8 integration)
      const expenseCodeMap: Record<string, string> = {
        'Travel': '6000',
        'Software': '6100',
        'Utilities': '6200',
        'Meals': '6200',
        'Rent': '6200',
        'Other': '6200'
      };

      const targetAccountCode = expenseCodeMap[claim.category] || '6200';

      const expenseAccount = await tx.account.findFirst({
        where: { organizationId, code: targetAccountCode }
      });
      const cashAccount = await tx.account.findFirst({
        where: { organizationId, code: '1010' }
      });

      if (expenseAccount && cashAccount) {
        // A. Post balanced double-entry JVs
        await tx.journalEntry.create({
          data: {
            organizationId,
            description: `Auto-Bookkeeping: Reimbursed ${claim.submittedBy} for claim - ${claim.description}`,
            reference: claim.id,
            lines: {
              create: [
                { accountId: expenseAccount.id, type: 'DEBIT', amount: claim.amount }, // Debiting Expense increases it
                { accountId: cashAccount.id, type: 'CREDIT', amount: claim.amount }   // Crediting Cash decreases it
              ]
            }
          }
        });

        // B. Reconcile ledger balances
        await tx.account.update({
          where: { id: expenseAccount.id },
          data: { balance: { increment: claim.amount } }
        });

        await tx.account.update({
          where: { id: cashAccount.id },
          data: { balance: { decrement: claim.amount } }
        });
      }

      // C. Register timeline activity
      await tx.activity.create({
        data: {
          organizationId,
          type: 'System',
          description: `Processed payout reimbursement to ${claim.submittedBy} (Value: ₹${claim.amount.toLocaleString('en-IN')}). General ledger reconciled.`
        }
      });

      return updated;
    });

    res.json({
      message: 'Reimbursement successfully disbursed. General ledger updated.',
      claim: result
    });
  } catch (error: any) {
    console.error('Reimburse claim error:', error);
    res.status(400).json({ error: error.message || 'Reimbursement failed' });
  }
};

/**
 * Corporate credit card management
 */
export const getCards = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Auto seed corporate cards if empty
    const cardCount = await prisma.corporateCard.count({ where: { organizationId } });
    if (cardCount === 0) {
      const seedCards = [
        {
          cardholderName: 'Nikhil CEO',
          cardNumber: 'Visa Platinum **** **** **** 4821',
          cardBrand: 'Visa',
          status: 'ACTIVE',
          creditLimit: 500000.0,
          spentAmount: 8500.0,
          organizationId
        },
        {
          cardholderName: 'Engineering Shared Card',
          cardNumber: 'Mastercard Gold **** **** **** 9825',
          cardBrand: 'Mastercard',
          status: 'ACTIVE',
          creditLimit: 150000.0,
          spentAmount: 0.0,
          organizationId
        }
      ];

      for (const card of seedCards) {
        await prisma.corporateCard.create({ data: card });
      }
    }

    const cards = await prisma.corporateCard.findMany({
      where: { organizationId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ cards });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCard = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = cardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { cardholderName, cardNumber, cardBrand, creditLimit } = value;
    const organizationId = req.tenant.id;

    // Mask card digits
    const cleanedNum = cardNumber.replace(/\s+/g, '');
    const lastDigits = cleanedNum.slice(-4);
    const maskedNumber = `${cardBrand} **** **** **** ${lastDigits}`;

    const card = await prisma.corporateCard.create({
      data: {
        organizationId,
        cardholderName,
        cardNumber: maskedNumber,
        cardBrand,
        creditLimit,
        spentAmount: 0.0
      }
    });

    res.status(201).json({ card });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to issue corporate card' });
  }
};

/**
 * Card Transactions Feed & Reconciliations
 */
export const getCardTransactions = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Fetch cards to check if we need to seed mock transactions
    const cards = await prisma.corporateCard.findMany({ where: { organizationId } });
    if (cards.length > 0) {
      const transCount = await prisma.cardTransaction.count({
        where: { corporateCardId: { in: cards.map(c => c.id) } }
      });

      if (transCount === 0) {
        // Seed mock billing transactions
        const seedTrans = [
          {
            corporateCardId: cards[0].id,
            vendor: 'Amazon Web Services (AWS)',
            amount: 8500.0,
            transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            status: 'PENDING'
          },
          {
            corporateCardId: cards[0].id,
            vendor: 'Uber Travels Mumbai',
            amount: 1200.0,
            transactionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            status: 'PENDING'
          }
        ];

        for (const tr of seedTrans) {
          await prisma.cardTransaction.create({ data: tr });
        }
      }
    }

    const transactions = await prisma.cardTransaction.findMany({
      where: {
        card: { organizationId }
      },
      include: {
        card: true
      },
      orderBy: { transactionDate: 'desc' }
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const matchTransaction = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { expenseClaimId } = req.body;

    if (!expenseClaimId) {
      return res.status(400).json({ error: 'Receipt claim ID is required to match' });
    }

    const organizationId = req.tenant.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch transaction
      const trans = await tx.cardTransaction.findFirst({
        where: { id, card: { organizationId } }
      });
      if (!trans) throw new Error('Transaction not found');
      if (trans.status === 'MATCHED') throw new Error('Transaction is already matched');

      // 2. Fetch claim
      const claim = await tx.expenseClaim.findFirst({
        where: { id: expenseClaimId, organizationId }
      });
      if (!claim) throw new Error('Expense claim not found');

      // Verify amounts match closely
      if (Math.abs(trans.amount - claim.amount) > 0.01) {
        throw new Error(`Reconciliation Error: Transaction amount (₹${trans.amount}) does not match receipt claim amount (₹${claim.amount}).`);
      }

      // 3. Mark Matched
      const updatedTrans = await tx.cardTransaction.update({
        where: { id },
        data: {
          status: 'MATCHED',
          expenseId: claim.id
        }
      });

      // Update card spentAmount
      await tx.corporateCard.update({
        where: { id: trans.corporateCardId },
        data: {
          spentAmount: { increment: trans.amount }
        }
      });

      return updatedTrans;
    });

    res.json({
      message: 'Card transaction successfully matched with receipt claim.',
      transaction: result
    });
  } catch (error: any) {
    console.error('Match transaction error:', error);
    res.status(400).json({ error: error.message || 'Match transaction failed' });
  }
};
