import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

export const getTimeline = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { clientId, leadId } = req.query;
    const filter: any = { organizationId: req.tenant.id };

    if (clientId) {
      filter.clientId = clientId as string;
    }
    if (leadId) {
      filter.leadId = leadId as string;
    }

    const activities = await prisma.activity.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { name: true } },
        lead: { select: { companyName: true } }
      }
    });

    res.json({ activities });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createActivity = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { clientId, leadId, type, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Activity type and description are required' });
    }

    const activity = await prisma.activity.create({
      data: {
        organizationId: req.tenant.id,
        clientId: clientId || null,
        leadId: leadId || null,
        type,
        description
      }
    });

    res.status(201).json({
      message: 'Activity recorded successfully',
      activity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
