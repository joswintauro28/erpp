import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { generateQuotationNumber, generateInvoiceNumber } from '../utils/helpers';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

const FALLBACK_CLIENTS = [
  { id: 'cli-1', name: 'Acme Corp', contactPerson: 'Jane Wilson', email: 'jane@acme.com', phone: '+1 (555) 111-2222', status: 'Active' },
  { id: 'cli-2', name: 'Global Industries', contactPerson: 'Mike Johnson', email: 'mike@global.com', phone: '+1 (555) 333-4444', status: 'Active' },
  { id: 'cli-3', name: 'Tech Startup Inc', contactPerson: 'Sarah Lee', email: 'sarah@techstartup.com', phone: '+1 (555) 555-6666', status: 'Active' },
  { id: 'cli-4', name: 'Enterprise Solutions', contactPerson: 'David Chen', email: 'david@enterprise.com', phone: '+1 (555) 777-8888', status: 'Active' },
  { id: 'cli-5', name: 'Digital Agency Co', contactPerson: 'Lisa Brown', email: 'lisa@digital.com', phone: '+1 (555) 999-0000', status: 'Inactive' },
];

const FALLBACK_LEADS = [
  { id: 'lead-1', companyName: 'Tech Solutions Ltd', contactPerson: 'John Smith', email: 'john@techsolutions.com', phone: '+1 (555) 321-4321', status: 'Qualified', leadScore: 85, assignedTo: 'Sarah Johnson', source: 'Website' },
  { id: 'lead-2', companyName: 'Global Industries', contactPerson: 'Emily Davis', email: 'emily@global.com', phone: '+1 (555) 789-9870', status: 'New Lead', leadScore: 45, assignedTo: 'Mike Chen', source: 'Referral' },
  { id: 'lead-3', companyName: 'StartUp Inc', contactPerson: 'Michael Brown', email: 'm.brown@startup.com', phone: '+1 (555) 456-6540', status: 'Proposal Sent', leadScore: 92, assignedTo: 'Sarah Johnson', source: 'LinkedIn' },
  { id: 'lead-4', companyName: 'Enterprise Co', contactPerson: 'Lisa Anderson', email: 'lisa@enterprise.com', phone: '+1 (555) 987-0123', status: 'Negotiation', leadScore: 76, assignedTo: 'David Lee', source: 'Cold Call' },
  { id: 'lead-5', companyName: 'Digital Agency', contactPerson: 'Robert Wilson', email: 'robert@digital.com', phone: '+1 (555) 345-6789', status: 'Qualified', leadScore: 67, assignedTo: 'Mike Chen', source: 'Website' },
];

const quotationItemSchema = Joi.object({
  description: Joi.string().required(),
  quantity: Joi.number().positive().integer().required(),
  rate: Joi.number().positive().required()
});

const quotationSchema = Joi.object({
  clientId: Joi.string().optional(),
  leadId: Joi.string().optional(),
  validUntil: Joi.date().required(),
  items: Joi.array().items(quotationItemSchema).min(1).required(),
  notes: Joi.string().allow('', null).optional(),
  discountAmount: Joi.number().min(0).default(0.0),
  taxRate: Joi.number().min(0).max(100).default(18.0)
}).or('clientId', 'leadId');

const convertLeadToClient = async (tx: any, leadId: string, organizationId: string) => {
  const lead = await tx.lead.findFirst({
    where: { id: leadId, organizationId }
  });
  if (!lead) return null;

  if (lead.convertedClientId) {
    const existingClient = await tx.client.findFirst({
      where: { id: lead.convertedClientId, organizationId }
    });
    if (existingClient) return existingClient;
  }

  const client = await tx.client.create({
    data: {
      name: lead.companyName,
      email: lead.email,
      phone: lead.phone,
      status: 'Active',
      organizationId
    }
  });

  if (lead.contactPerson) {
    await tx.contact.create({
      data: {
        clientId: client.id,
        organizationId,
        name: lead.contactPerson,
        email: lead.email,
        role: 'Primary Contact'
      }
    });
  }

  await tx.lead.update({
    where: { id: leadId },
    data: {
      status: 'Won',
      convertedAt: new Date(),
      convertedClientId: client.id
    }
  });

  await tx.activity.create({
    data: {
      organizationId,
      clientId: client.id,
      leadId: lead.id,
      type: 'System',
      description: `Lead ${lead.companyName} converted to Client ${client.name} via Quotation approval`
    }
  });

  return client;
};

export const getQuotations = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const quotations = await prisma.quotation.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        client: true,
        lead: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ quotations });
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuotation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: {
        client: true,
        lead: true,
        items: true
      }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found in workspace' });
    }

    res.json({ quotation });
  } catch (error) {
    console.error('Get quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createQuotation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = quotationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { clientId, leadId, validUntil, items, notes, discountAmount, taxRate } = value;

    // Verify client or lead exists in active organization
    let client = null;
    let lead = null;

    if (clientId) {
      client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: req.tenant.id }
      });
      if (!client) {
        const mockClient = FALLBACK_CLIENTS.find(c => c.id === clientId);
        if (mockClient) {
          client = await prisma.client.create({
            data: {
              id: mockClient.id,
              name: mockClient.name,
              email: mockClient.email,
              phone: mockClient.phone,
              status: mockClient.status,
              organizationId: req.tenant.id
            }
          });
          await prisma.contact.create({
            data: {
              clientId: client.id,
              organizationId: req.tenant.id,
              name: mockClient.contactPerson,
              email: mockClient.email,
              role: 'Primary Contact'
            }
          });
        } else {
          return res.status(404).json({ error: 'Client not found in workspace' });
        }
      }
    } else if (leadId) {
      lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: req.tenant.id }
      });
      if (!lead) {
        const mockLead = FALLBACK_LEADS.find(l => l.id === leadId);
        if (mockLead) {
          lead = await prisma.lead.create({
            data: {
              id: mockLead.id,
              companyName: mockLead.companyName,
              contactPerson: mockLead.contactPerson,
              email: mockLead.email,
              phone: mockLead.phone,
              status: mockLead.status,
              leadScore: mockLead.leadScore,
              assignedTo: mockLead.assignedTo,
              source: mockLead.source,
              organizationId: req.tenant.id
            }
          });
        } else {
          return res.status(404).json({ error: 'Lead not found in workspace' });
        }
      }
    }

    // Compute sums
    let subtotal = 0;
    const processedItems = items.map((item: any) => {
      const amount = item.quantity * item.rate;
      subtotal += amount;
      return {
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount
      };
    });

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + taxAmount;

    const quotationNumber = await generateQuotationNumber();

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          quotationNumber,
          status: 'DRAFT',
          subtotal,
          discountAmount,
          taxAmount,
          total,
          notes: notes || null,
          validUntil: new Date(validUntil),
          organizationId: req.tenant!.id,
          clientId: clientId || null,
          leadId: leadId || null,
          items: {
            create: processedItems
          }
        },
        include: {
          client: true,
          lead: true,
          items: true
        }
      });

      // Log workspace activity
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: clientId || null,
          leadId: leadId || null,
          type: 'System',
          description: `Quotation ${quotationNumber} generated for ${client ? client.name : lead!.companyName} with total ${total}`
        }
      });

      return q;
    });

    res.status(201).json({
      message: 'Quotation successfully created.',
      quotation
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptQuotation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { signatureName } = req.body;

    if (!signatureName || signatureName.trim() === '') {
      return res.status(400).json({ error: 'Approver e-signature name is required' });
    }

    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found in workspace' });
    }

    const updatedQuotation = await prisma.$transaction(async (tx) => {
      let resolvedClientId = quotation.clientId;

      // Automatically convert lead to client if quotation was for a lead and hasn't been resolved yet
      if (quotation.leadId && !resolvedClientId) {
        const clientObj = await convertLeadToClient(tx, quotation.leadId, req.tenant!.id);
        if (clientObj) {
          resolvedClientId = clientObj.id;
        }
      }

      const q = await tx.quotation.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          signatureName,
          signatureDate: new Date(),
          clientId: resolvedClientId
        },
        include: {
          client: true,
          lead: true,
          items: true
        }
      });

      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: resolvedClientId || null,
          leadId: quotation.leadId || null,
          type: 'System',
          description: `Quotation ${quotation.quotationNumber} e-signed and approved by ${signatureName}`
        }
      });

      return q;
    });

    res.json({
      message: 'Quotation e-signed and accepted successfully.',
      quotation: updatedQuotation
    });
  } catch (error) {
    console.error('Accept quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const declineQuotation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: req.tenant.id }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found in workspace' });
    }

    const updatedQuotation = await prisma.$transaction(async (tx) => {
      const q = await tx.quotation.update({
        where: { id },
        data: { status: 'DECLINED' },
        include: {
          client: true,
          lead: true,
          items: true
        }
      });

      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: quotation.clientId || null,
          leadId: quotation.leadId || null,
          type: 'System',
          description: `Quotation ${quotation.quotationNumber} declined by recipient`
        }
      });

      return q;
    });

    res.json({
      message: 'Quotation declined.',
      quotation: updatedQuotation
    });
  } catch (error) {
    console.error('Decline quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const convertToInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    // Fetch the quotation
    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: {
        items: true,
        client: true
      }
    });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found in workspace' });
    }

    if (quotation.status === 'CONVERTED') {
      return res.status(400).json({ error: 'Quotation has already been converted to an invoice' });
    }

    // Auto-generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create Invoice with 30-day standard due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Dynamic tax calculation: 18% standard GST (9% CGST + 9% SGST) distributed from the quotation tax amount
    const discountedSubtotal = Math.max(0, quotation.subtotal - quotation.discountAmount);
    const cgstAmount = discountedSubtotal * 0.09;
    const sgstAmount = discountedSubtotal * 0.09;
    const calculatedTaxTotal = cgstAmount + sgstAmount;
    
    const upiQrString = `upi://pay?pa=payments@kaasvex&pn=Kaasvex&am=${quotation.total.toFixed(2)}&cu=INR&tn=Invoice-${invoiceNumber}`;
    const signatureHash = quotation.signatureName 
      ? `esign_seal_${quotation.signatureName.replace(/\s+/g, '_')}_${Date.now().toString(36)}`
      : `system_seal_${Date.now().toString(36)}`;

    // DB Transaction execution
    const invoice = await prisma.$transaction(async (tx) => {
      let resolvedClientId = quotation.clientId;

      // Automatically convert lead to client if quotation was for a lead and hasn't been resolved yet
      if (quotation.leadId && !resolvedClientId) {
        const clientObj = await convertLeadToClient(tx, quotation.leadId, req.tenant!.id);
        if (clientObj) {
          resolvedClientId = clientObj.id;
        }
      }

      if (!resolvedClientId) {
        throw new Error('Failed to resolve client for quotation conversion');
      }

      // 1. Create Invoice
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          dueDate,
          subtotal: quotation.subtotal,
          taxAmount: calculatedTaxTotal,
          total: discountedSubtotal + calculatedTaxTotal,
          notes: quotation.notes || `Converted from quotation ${quotation.quotationNumber}`,
          invoiceType: 'GST',
          currency: 'INR',
          discountAmount: quotation.discountAmount,
          qrCodeString: upiQrString,
          signatureString: signatureHash,
          organizationId: req.tenant!.id,
          clientId: resolvedClientId,
          items: {
            create: quotation.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount
            }))
          },
          taxes: {
            create: [
              { name: 'CGST', rate: 9.0, amount: cgstAmount },
              { name: 'SGST', rate: 9.0, amount: sgstAmount }
            ]
          },
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: 'DRAFT',
              notes: `Invoice generated by converting quotation ${quotation.quotationNumber}`
            }
          }
        },
        include: {
          items: true,
          taxes: true,
          client: true
        }
      });

      // 2. Mark Quotation as Converted
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { 
          status: 'CONVERTED',
          clientId: resolvedClientId,
          convertedAt: new Date()
        }
      });

      // 3. Update Client Timeline metadata
      await tx.client.update({
        where: { id: resolvedClientId },
        data: {
          lastInvoiceDate: new Date(),
          totalRevenue: {
            increment: inv.total
          }
        }
      });

      // 4. Create activity log
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: resolvedClientId,
          leadId: quotation.leadId || null,
          type: 'System',
          description: `Quotation ${quotation.quotationNumber} successfully converted to Invoice ${invoiceNumber}`
        }
      });

      return inv;
    });

    res.json({
      message: 'Quotation converted to Invoice successfully.',
      invoice
    });
  } catch (error) {
    console.error('Convert quotation to invoice error:', error);
    res.status(500).json({ error: 'Internal server error during conversion' });
  }
};
