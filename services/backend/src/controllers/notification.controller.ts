import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { 
  telemetryMetrics, 
  brokerLogs, 
  setBrokerType, 
  queueNotification, 
  ensureDefaultSettings,
  BrokerType 
} from '../services/notification.service';

const prisma = new PrismaClient();

// GET /api/notifications
export const getNotificationsData = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Ensure settings exist (seed defaults if empty)
    await ensureDefaultSettings(organizationId);

    // Fetch settings and logs
    const settings = await prisma.notificationSetting.findMany({
      where: { organizationId },
      orderBy: { event: 'asc' }
    });

    const logs = await prisma.notificationLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50 // cap at latest 50 logs for premium visual flow
    });

    res.json({
      settings,
      logs,
      brokerMetrics: telemetryMetrics,
      brokerLogs: brokerLogs
    });
  } catch (error) {
    console.error('Get notifications data error:', error);
    res.status(500).json({ error: 'Internal server error fetching notifications context' });
  }
};

// POST /api/notifications/settings
export const updateNotificationSettings = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;
    const { settings } = req.body; // Array of setting objects

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid settings payload format. Expected Array.' });
    }

    for (const item of settings) {
      const { event, emailEnabled, smsEnabled, whatsappEnabled, pushEnabled, inAppEnabled } = item;
      
      await prisma.notificationSetting.upsert({
        where: {
          organizationId_event: { organizationId, event }
        },
        update: {
          emailEnabled: !!emailEnabled,
          smsEnabled: !!smsEnabled,
          whatsappEnabled: !!whatsappEnabled,
          pushEnabled: !!pushEnabled,
          inAppEnabled: !!inAppEnabled
        },
        create: {
          organizationId,
          event,
          emailEnabled: !!emailEnabled,
          smsEnabled: !!smsEnabled,
          whatsappEnabled: !!whatsappEnabled,
          pushEnabled: !!pushEnabled,
          inAppEnabled: !!inAppEnabled
        }
      });
    }

    res.json({ message: 'Communication channels updated successfully.' });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Internal server error updating settings' });
  }
};

// POST /api/notifications/change-broker
export const changeBroker = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { broker } = req.body;
    const validBrokers: BrokerType[] = ['KAFKA', 'RABBITMQ', 'AWS_SQS'];

    if (!validBrokers.includes(broker)) {
      return res.status(400).json({ error: 'Invalid broker parameter choice.' });
    }

    setBrokerType(broker);
    res.json({ message: `Active message broker toggled to ${broker}.` });
  } catch (error) {
    console.error('Change broker error:', error);
    res.status(500).json({ error: 'Internal server error switching queue broker' });
  }
};

// POST /api/notifications/test
export const triggerTestNotification = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;
    const { event, recipient, content } = req.body;

    if (!event || !recipient || !content) {
      return res.status(400).json({ error: 'Missing parameters event, recipient, or content.' });
    }

    await queueNotification({
      organizationId,
      event,
      recipient,
      content
    });

    res.json({ message: 'Manual test message successfully staged inside queue broker.' });
  } catch (error) {
    console.error('Trigger test notification error:', error);
    res.status(500).json({ error: 'Internal server error dispatching test notification' });
  }
};

// POST /api/notifications/trigger-overdue
export const triggerOverdueAudit = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;
    const now = new Date();

    // 1. Audit invoices that are overdue
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        dueDate: { lt: now },
        status: { in: ['SENT', 'PARTIALLY_PAID'] }
      },
      include: { client: true }
    });

    const updatedInvoices = [];

    for (const invoice of overdueInvoices) {
      // Transition to OVERDUE inside transaction
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' }
        }),
        prisma.invoiceStatusLog.create({
          data: {
            invoiceId: invoice.id,
            fromStatus: invoice.status,
            toStatus: 'OVERDUE',
            notes: 'Invoice audited and flagged as OVERDUE: past due date.'
          }
        })
      ]);

      // Queue an Overdue reminder notification
      await queueNotification({
        organizationId,
        event: 'OVERDUE_REMINDER',
        recipient: invoice.client.email,
        content: `ALERT: Invoice ${invoice.invoiceNumber} for ₹${invoice.total.toLocaleString('en-IN')} is overdue. Please settle immediately.`
      });

      updatedInvoices.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        total: invoice.total,
        dueDate: invoice.dueDate
      });
    }

    res.json({
      message: `Audited outstanding invoices. Flagged ${updatedInvoices.length} invoices as OVERDUE.`,
      updated: updatedInvoices
    });
  } catch (error) {
    console.error('Trigger overdue audit error:', error);
    res.status(500).json({ error: 'Internal server error running overdue invoice audit' });
  }
};
