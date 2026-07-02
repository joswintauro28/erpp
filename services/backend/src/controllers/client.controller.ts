import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

const clientSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null).optional(),
  address: Joi.string().allow('', null).optional(),
  gstin: Joi.string().allow('', null).optional(),
  billingAddress: Joi.string().allow('', null).optional(),
  creditLimit: Joi.number().min(0).optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
  contactPerson: Joi.string().allow('', null).optional()
});

export const getClients = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const clients = await prisma.client.findMany({
      where: { organizationId: req.tenant.id },
      include: { contacts: true },
      orderBy: { createdAt: 'desc' }
    });

    const mappedClients = clients.map(c => {
      const { contacts, ...clientRest } = c;
      return {
        ...clientRest,
        contactPerson: contacts[0]?.name || null
      };
    });

    res.json({ clients: mappedClients });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClient = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = clientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { contactPerson, ...clientData } = value;

    const client = await prisma.client.create({
      data: {
        ...clientData,
        organizationId: req.tenant.id
      }
    });

    if (contactPerson) {
      await prisma.contact.create({
        data: {
          clientId: client.id,
          organizationId: req.tenant.id,
          name: contactPerson,
          email: clientData.email,
          role: 'Primary Contact'
        }
      });
    }

    res.status(201).json({
      message: 'Client created successfully',
      client: {
        ...client,
        contactPerson: contactPerson || null
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateClient = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { error, value } = clientSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify client belongs to active tenant
    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found in workspace' });
    }

    const { contactPerson, ...clientData } = value;

    const client = await prisma.client.update({
      where: { id },
      data: clientData
    });

    if (contactPerson !== undefined) {
      const firstContact = await prisma.contact.findFirst({
        where: { clientId: id }
      });
      if (firstContact) {
        await prisma.contact.update({
          where: { id: firstContact.id },
          data: { name: contactPerson }
        });
      } else {
        await prisma.contact.create({
          data: {
            clientId: id,
            organizationId: req.tenant.id,
            name: contactPerson,
            email: clientData.email || existingClient.email,
            role: 'Primary Contact'
          }
        });
      }
    }

    res.json({
      message: 'Client updated successfully',
      client: {
        ...client,
        contactPerson: contactPerson || null
      }
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClient = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    // Verify client belongs to active tenant
    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!existingClient) {
      return res.status(404).json({ error: 'Client not found in workspace' });
    }

    await prisma.client.delete({
      where: { id }
    });

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
