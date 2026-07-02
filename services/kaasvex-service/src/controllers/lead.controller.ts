import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

const leadSchema = Joi.object({
  companyName: Joi.string().min(2).required(),
  contactPerson: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost', 'Converted').default('New Lead'),
  leadScore: Joi.number().min(0).max(100).default(50),
  assignedTo: Joi.string().allow('', null).optional(),
  source: Joi.string().valid('Website', 'Referral', 'LinkedIn', 'Cold Call').default('Website')
});

export const getLeads = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const leads = await prisma.lead.findMany({
      where: { organizationId: req.tenant.id },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createLead = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = leadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const lead = await prisma.lead.create({
      data: {
        ...value,
        organizationId: req.tenant.id
      }
    });

    // Record an onboarding Activity log
    await prisma.activity.create({
      data: {
        organizationId: req.tenant.id,
        leadId: lead.id,
        type: 'System',
        description: `Lead created for ${lead.companyName} (Contact: ${lead.contactPerson}). Inbound source: ${lead.source}. Initial Lead Score: ${lead.leadScore}.`
      }
    });

    res.status(201).json({
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLead = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { error, value } = leadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify lead belongs to active organization
    const existingLead = await prisma.lead.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found in workspace' });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: value
    });

    // Log Activity if status changed
    if (existingLead.status !== lead.status) {
      await prisma.activity.create({
        data: {
          organizationId: req.tenant.id,
          leadId: lead.id,
          type: 'System',
          description: `Lead status updated from "${existingLead.status}" to "${lead.status}".`
        }
      });
    }

    res.json({
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLead = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    // Verify lead belongs to active organization
    const existingLead = await prisma.lead.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found in workspace' });
    }

    await prisma.lead.delete({
      where: { id }
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
