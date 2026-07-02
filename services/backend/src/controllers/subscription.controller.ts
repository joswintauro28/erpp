import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { queueNotification } from '../services/notification.service';

const prisma = new PrismaClient();

// Helper to auto-seed plans if database is completely empty
const checkAndSeedPlans = async () => {
  const count = await prisma.plan.count();
  if (count === 0) {
    const defaultPlans = [
      {
        name: 'Basic flat-rate plan',
        code: 'starter',
        description: 'Fixed monthly flat rate with 14-day trial period',
        pricingModel: 'FIXED',
        basePrice: 999.0,
        trialDays: 14,
        currency: 'INR'
      },
      {
        name: 'Growth Seat-Based plan',
        code: 'growth',
        description: 'Seat-based billing: base fee of ₹499/seat with 7-day trial',
        pricingModel: 'SEAT',
        basePrice: 499.0,
        trialDays: 7,
        currency: 'INR'
      },
      {
        name: 'Developer API Metered',
        code: 'developer',
        description: 'Metered usage-based pricing: charging ₹0.05 per API Request',
        pricingModel: 'METERED',
        basePrice: 0.05,
        trialDays: 0,
        currency: 'INR'
      },
      {
        name: 'Enterprise Tiered Volume',
        code: 'enterprise',
        description: 'Tiered volume pricing: 0-100 units = ₹10/unit, 101-500 = ₹8/unit, 501+ = ₹5/unit',
        pricingModel: 'TIERED',
        basePrice: 1000.0, // base fee
        trialDays: 0,
        currency: 'INR',
        metadata: JSON.stringify({
          tiers: [
            { up_to: 100, rate: 10.0 },
            { up_to: 500, rate: 8.0 },
            { up_to: null, rate: 5.0 }
          ]
        })
      }
    ];

    for (const plan of defaultPlans) {
      await prisma.plan.create({ data: plan });
    }
  }
};

const subscriptionSchema = Joi.object({
  clientId: Joi.string().required(),
  planId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1)
});

const usageSchema = Joi.object({
  metricName: Joi.string().required(),
  quantity: Joi.number().positive().required()
});

export const getPlans = async (req: MultiTenantRequest, res: Response) => {
  try {
    await checkAndSeedPlans();
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' }
    });
    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubscriptions = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        client: true,
        plan: true,
        usageRecords: true,
        invoices: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSubscription = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = subscriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { clientId, planId, quantity } = value;

    // Verify client exists
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: req.tenant.id }
    });
    if (!client) {
      return res.status(404).json({ error: 'Client not found in workspace' });
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });
    if (!plan) {
      return res.status(404).json({ error: 'SaaS plan not found' });
    }

    // Compute period dates
    const now = new Date();
    const currentPeriodStart = now;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30); // 30-day billing cycle

    let status = 'ACTIVE';
    let trialStart = null;
    let trialEnd = null;

    if (plan.trialDays > 0) {
      status = 'TRIALING';
      trialStart = now;
      trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: {
          organizationId: req.tenant!.id,
          clientId,
          planId,
          quantity,
          status,
          trialStart,
          trialEnd,
          currentPeriodStart,
          currentPeriodEnd
        },
        include: {
          client: true,
          plan: true
        }
      });

      // Write System Log Activity
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId,
          type: 'System',
          description: `Subscription activated for plan "${plan.name}" (${plan.pricingModel}). Status: ${status}.`
        }
      });

      return sub;
    });

    res.status(201).json({
      message: 'Subscription successfully initiated.',
      subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logUsage = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { error, value } = usageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { metricName, quantity } = value;

    // Verify subscription belongs to organization
    const subscription = await prisma.subscription.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Active subscription not found' });
    }

    const record = await prisma.usageRecord.create({
      data: {
        subscriptionId: id,
        metricName,
        quantity,
        timestamp: new Date()
      }
    });

    res.status(201).json({
      message: 'Usage record successfully registered.',
      record
    });
  } catch (error) {
    console.error('Log usage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelSubscription = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const subscription = await prisma.subscription.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id },
        data: {
          cancelAtPeriodEnd: true,
          status: 'CANCELLED' // Soft transition
        },
        include: { client: true, plan: true }
      });

      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: sub.clientId,
          type: 'System',
          description: `Subscription plan "${sub.plan.name}" scheduled for cancellation.`
        }
      });

      return sub;
    });

    res.json({
      message: 'Subscription marked for cancellation.',
      subscription: updated
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Automation Invoice Number generator
const generateSubInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastInv = await prisma.subscriptionInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `SUB-${year}${month}`
      }
    },
    orderBy: { invoiceNumber: 'desc' }
  });

  let sequence = 1;
  if (lastInv) {
    const parts = lastInv.invoiceNumber.split('-');
    const lastSequence = parseInt(parts[2] || parts[1]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `SUB-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

export const runCronSimulation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    // Get all subscriptions for this tenant
    const subscriptions = await prisma.subscription.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        plan: true,
        client: true,
        usageRecords: true
      }
    });

    const invoicesCreated = [];

    const now = new Date();

    for (const sub of subscriptions) {
      // 1. Check expired trials
      if (sub.status === 'TRIALING' && sub.trialEnd && sub.trialEnd <= now) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'ACTIVE' }
        });
        sub.status = 'ACTIVE';
      }

      // Skip cancelled subscription renewals
      if (sub.status === 'CANCELLED') continue;

      // 2. Process active billing cycles
      // For visual testing & cron simulation, we will run billing instantly on ANY active subscription 
      // even if renewal date hasn't fully passed, or strictly check. For high fidelity, let's charge them:
      let billingSubtotal = 0;
      const model = sub.plan.pricingModel;

      if (model === 'FIXED') {
        billingSubtotal = sub.plan.basePrice;
      } else if (model === 'SEAT') {
        billingSubtotal = sub.plan.basePrice * sub.quantity;
      } else if (model === 'METERED') {
        // Accumulate active usages in current period
        const periodUsages = sub.usageRecords.filter(r => r.timestamp >= sub.currentPeriodStart);
        const totalUnits = periodUsages.reduce((sum, curr) => sum + curr.quantity, 0);
        billingSubtotal = sub.plan.basePrice * totalUnits;
      } else if (model === 'TIERED') {
        // Accumulate usage
        const periodUsages = sub.usageRecords.filter(r => r.timestamp >= sub.currentPeriodStart);
        const totalUnits = periodUsages.reduce((sum, curr) => sum + curr.quantity, 0);
        
        let pricingTiers = [];
        try {
          pricingTiers = sub.plan.metadata ? JSON.parse(sub.plan.metadata).tiers : [];
        } catch {}

        if (pricingTiers.length > 0) {
          let unitsRemaining = totalUnits;
          let calculatedSum = sub.plan.basePrice; // Base fee

          for (let i = 0; i < pricingTiers.length; i++) {
            const tier = pricingTiers[i];
            const prevLimit = i === 0 ? 0 : pricingTiers[i - 1].up_to || 0;
            const currentLimit = tier.up_to;
            const rate = tier.rate;

            if (currentLimit === null) {
              // Unlimited tier
              calculatedSum += unitsRemaining * rate;
              unitsRemaining = 0;
              break;
            } else {
              const tierCapacity = currentLimit - prevLimit;
              const unitsInTier = Math.min(unitsRemaining, tierCapacity);
              calculatedSum += unitsInTier * rate;
              unitsRemaining -= unitsInTier;
              if (unitsRemaining <= 0) break;
            }
          }
          billingSubtotal = calculatedSum;
        } else {
          // Standard backup pricing
          billingSubtotal = sub.plan.basePrice + (totalUnits * 5.0);
        }
      }

      // Add CGST (9%) + SGST (9%) standard taxes
      const taxAmount = billingSubtotal * 0.18;
      const totalAmount = billingSubtotal + taxAmount;

      const invoiceNumber = await generateSubInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15); // 15-day payment window

      // Execute inside transaction for robustness
      const invoice = await prisma.$transaction(async (tx) => {
        // A. Generate Subscription Receipt
        const inv = await tx.subscriptionInvoice.create({
          data: {
            invoiceNumber,
            subscriptionId: sub.id,
            status: 'UNPAID',
            subtotal: billingSubtotal,
            taxAmount,
            total: totalAmount,
            dueDate
          }
        });

        // B. Roll period dates forward
        const newPeriodStart = new Date(sub.currentPeriodEnd);
        const newPeriodEnd = new Date(sub.currentPeriodEnd);
        newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd
          }
        });

        // C. Log CRM revenues (totalRevenue increments)
        await tx.client.update({
          where: { id: sub.clientId },
          data: {
            totalRevenue: {
              increment: totalAmount
            }
          }
        });

        // D. Activity timeline
        await tx.activity.create({
          data: {
            organizationId: req.tenant!.id,
            clientId: sub.clientId,
            type: 'Payment',
            description: `Auto-renewal generated invoice ${invoiceNumber} for ₹${totalAmount.toFixed(2)} on plan "${sub.plan.name}".`
          }
        });

        return inv;
      });

      // Queue subscription renewal notification
      await queueNotification({
        organizationId: req.tenant.id,
        event: 'SUBSCRIPTION_RENEWAL',
        recipient: sub.client.email,
        content: `Subscription for plan "${sub.plan.name}" has renewed. Generated renewal Invoice: ${invoice.invoiceNumber} for ₹${invoice.total.toLocaleString('en-IN')}.`
      });

      invoicesCreated.push({
        client: sub.client.name,
        plan: sub.plan.name,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total
      });
    }

    res.json({
      message: 'Subscription billing engine processed auto-renewals.',
      processedCount: invoicesCreated.length,
      invoices: invoicesCreated
    });
  } catch (error) {
    console.error('Cron simulation failure:', error);
    res.status(500).json({ error: 'Billing simulation failed' });
  }
};
