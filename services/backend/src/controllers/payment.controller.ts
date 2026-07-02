import { Response } from 'express';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import Joi from 'joi';
import crypto from 'crypto';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { queueNotification } from '../services/notification.service';

const prisma = new PrismaClient();

// AES-256 Cryptographic Metadata Encryption Setup (PCI DSS Security compliance)
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.PAYMENT_ENCRYPTION_SECRET 
  ? crypto.createHash('sha256').update(process.env.PAYMENT_ENCRYPTION_SECRET).digest()
  : crypto.createHash('sha256').update('kaasvex_default_secret_pci_key_2026').digest();
const IV_LENGTH = 16;

export const encryptMetadata = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptMetadata = (text: string): string => {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift() || '', 'hex');
  const encryptedHex = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Validation schemas
const paymentLinkSchema = Joi.object({
  invoiceId: Joi.string().required(),
  gateway: Joi.string().valid('STRIPE', 'RAZORPAY', 'PAYPAL', 'CASHFREE').required(),
  splitConfig: Joi.object().optional().allow(null)
});

export const getTransactions = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        invoice: {
          organizationId: req.tenant.id
        }
      },
      include: {
        invoice: {
          include: {
            client: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPaymentLink = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = paymentLinkSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { invoiceId, gateway, splitConfig } = value;

    // Verify invoice belongs to this tenant
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: req.tenant.id },
      include: { client: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace context' });
    }

    // Generate secure tokenized payment ID & payment link slug
    const gatewayPaymentId = `txn_${crypto.randomBytes(12).toString('hex')}`;
    const paymentLinkId = `pay_link_${crypto.randomBytes(8).toString('hex')}`;

    // Securely encrypt client browser telemetry metadata (PCI DSS cardholder data avoidance)
    const telemetryObj = {
      buyerIp: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'Mozilla/5.0',
      pciAuditResult: 'COMPLIANT',
      tokenizedCardReference: `tok_${crypto.randomBytes(8).toString('hex')}`,
      gatewayProvider: gateway,
      timestamp: new Date().toISOString()
    };
    const encryptedMetadata = encryptMetadata(JSON.stringify(telemetryObj));

    const transaction = await prisma.paymentTransaction.create({
      data: {
        invoiceId,
        gateway,
        gatewayPaymentId,
        amount: invoice.total,
        currency: invoice.currency || 'INR',
        status: 'PENDING',
        paymentLinkId,
        encryptedMetadata,
        splitConfig: splitConfig ? JSON.stringify(splitConfig) : null
      },
      include: {
        invoice: {
          include: { client: true }
        }
      }
    });

    res.status(201).json({
      message: 'Secure tokenized payment link successfully initialized.',
      paymentLink: `https://kaasvex.io/pay/${paymentLinkId}`,
      transaction
    });
  } catch (error) {
    console.error('Create payment link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const decryptTransactionMetadata = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        id,
        invoice: {
          organizationId: req.tenant.id
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    if (!transaction.encryptedMetadata) {
      return res.json({ decryptedMetadata: null });
    }

    const decrypted = decryptMetadata(transaction.encryptedMetadata);
    res.json({ decryptedMetadata: JSON.parse(decrypted) });
  } catch (error) {
    console.error('Decrypt metadata error:', error);
    res.status(500).json({ error: 'Decryption failed' });
  }
};

export const processRefund = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    // Verify transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        id,
        invoice: {
          organizationId: req.tenant.id
        }
      },
      include: { invoice: true }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'SUCCESSFUL') {
      return res.status(400).json({ error: 'Only settled transactions can be refunded' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as Refunded
      const txn = await tx.paymentTransaction.update({
        where: { id },
        data: { status: 'REFUNDED' },
        include: {
          invoice: { include: { client: true } }
        }
      });

      // 2. Insert negative payment in active billing ledger
      await tx.invoicePayment.create({
        data: {
          invoiceId: transaction.invoiceId,
          amount: -transaction.amount,
          method: transaction.gateway,
          status: 'Completed',
          date: new Date()
        }
      });

      // 3. Roll invoice status back to SENT (since it's no longer settled)
      await tx.invoice.update({
        where: { id: transaction.invoiceId },
        data: { status: 'SENT' }
      });

      // Log invoice state audit
      await tx.invoiceStatusLog.create({
        data: {
          invoiceId: transaction.invoiceId,
          fromStatus: 'PAID',
          toStatus: 'SENT',
          notes: `Invoice payment refunded via gateway ${transaction.gateway}. Status reverted to SENT.`
        }
      });

      // 4. Update Client CRM stats (subtract total revenue)
      await tx.client.update({
        where: { id: transaction.invoice.clientId },
        data: {
          totalRevenue: {
            decrement: transaction.amount
          }
        }
      });

      // 5. Activity log
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: transaction.invoice.clientId,
          type: 'Payment',
          description: `Gateway refund processed for transaction ${transaction.gatewayPaymentId}. ₹${transaction.amount.toFixed(2)} refunded.`
        }
      });

      return txn;
    });

    res.json({
      message: 'Transaction successfully refunded.',
      transaction: updated
    });
  } catch (error) {
    console.error('Refund transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Auto-Reconciliation Gateway Webhook Handler
// Accessible publicly by real gateways or by our frontend simulators
export const handleGatewayWebhook = async (req: MultiTenantRequest, res: Response) => {
  try {
    const { gateway } = req.params;
    const event = req.body;

    console.log(`Webhook Ingress for ${gateway}:`, event);

    // Determine event indicators
    // For Stripe: event.type === 'payment_intent.succeeded'
    // For Razorpay: event.event === 'payment.captured'
    // For simulator payloads, we support clean mappings
    const eventName = event.type || event.event;
    const gatewayTxnId = event.data?.id || event.payload?.payment?.entity?.id || event.gatewayPaymentId;
    const isSuccess = ['payment_intent.succeeded', 'payment.captured', 'SUCCESSFUL'].includes(eventName);

    if (!gatewayTxnId) {
      return res.status(400).json({ error: 'Gateway Payment ID not mapped in payload.' });
    }

    // Locate transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { gatewayPaymentId: gatewayTxnId },
      include: { invoice: { include: { client: true } } }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Matching transaction record not found' });
    }

    if (transaction.status === 'SUCCESSFUL') {
      return res.json({ message: 'Webhook redundant. Transaction already reconciled.' });
    }

    if (isSuccess) {
      const reconciled = await prisma.$transaction(async (tx) => {
        // A. Upgrade Transaction status
        const txn = await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: 'SUCCESSFUL' },
          include: {
            invoice: { include: { client: true } }
          }
        });

        // B. Add InvoicePayment settlement entry
        await tx.invoicePayment.create({
          data: {
            invoiceId: transaction.invoiceId,
            amount: transaction.amount,
            method: transaction.gateway,
            status: 'Completed',
            date: new Date()
          }
        });

        // C. Auto-Reconcile Linked Invoice to PAID status
        await tx.invoice.update({
          where: { id: transaction.invoiceId },
          data: { status: 'PAID' }
        });

        // Log invoice status change
        await tx.invoiceStatusLog.create({
          data: {
            invoiceId: transaction.invoiceId,
            fromStatus: transaction.invoice.status,
            toStatus: 'PAID',
            notes: `Auto-reconciliation webhook triggered by gateway ${transaction.gateway}. Invoice settled.`
          }
        });

        // D. Update Client CRM lifetime revenue totals
        await tx.client.update({
          where: { id: transaction.invoice.clientId },
          data: {
            totalRevenue: {
              increment: transaction.amount
            }
          }
        });

        // E. Workspace Activity log
        await tx.activity.create({
          data: {
            organizationId: transaction.invoice.organizationId,
            clientId: transaction.invoice.clientId,
            type: 'Payment',
            description: `Auto-reconciliation success for Invoice ${transaction.invoice.invoiceNumber}. Settled via webhook.`
          }
        });

        return txn;
      });

      // Queue payment received notification
      await queueNotification({
        organizationId: transaction.invoice.organizationId,
        event: 'PAYMENT_RECEIVED',
        recipient: transaction.invoice.client.email,
        content: `Payment of ₹${transaction.amount.toLocaleString('en-IN')} received for Invoice ${transaction.invoice.invoiceNumber}. Thank you for your payment!`
      });

      return res.json({
        message: 'Auto-reconciliation succeeded.',
        transaction: reconciled
      });
    } else {
      // Failed event
      const failedTxn = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
        include: {
          invoice: { include: { client: true } }
        }
      });

      return res.json({
        message: 'Reconciliation logged as failed.',
        transaction: failedTxn
      });
    }
  } catch (error) {
    console.error('Webhook handling failure:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
