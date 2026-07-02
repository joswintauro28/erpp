import { Response } from 'express';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import Joi from 'joi';
import { generateInvoiceNumber } from '../utils/helpers';
import { generateInvoicePDF } from '../services/pdf.service';
import { sendInvoiceEmail } from '../services/email.service';
import { MultiTenantRequest } from '../middleware/tenant.middleware';
import { queueNotification } from '../services/notification.service';
import { createEWayBillRecord } from '../services/eway-bill.service';

const prisma = new PrismaClient();

const taxSchema = Joi.object({
  name: Joi.string().required(),
  rate: Joi.number().min(0).max(100).required()
});

const invoiceItemSchema = Joi.object({
  description: Joi.string().required(),
  quantity: Joi.number().positive().integer().required(),
  rate: Joi.number().positive().required()
});

const invoiceSchema = Joi.object({
  clientId: Joi.string().required(),
  dueDate: Joi.date().required(),
  items: Joi.array().items(invoiceItemSchema).min(1).required(),
  notes: Joi.string().allow('', null).optional(),
  
  // Advanced core engine fields (Module 3)
  invoiceType: Joi.string().valid('GST', 'RECURRING', 'PROFORMA', 'DEBIT_NOTE', 'CREDIT_NOTE').default('GST'),
  currency: Joi.string().length(3).uppercase().default('USD'),
  discountAmount: Joi.number().min(0).default(0.0),
  taxes: Joi.array().items(taxSchema).optional(),

  // Optional Transportation Details for auto-generating E-Way Bills
  transportDetails: Joi.object({
    transporterName: Joi.string().required(),
    transporterId: Joi.string().required(),
    vehicleNo: Joi.string().required(),
    transportMode: Joi.string().valid('Road', 'Rail', 'Air', 'Ship').required(),
    dispatchLocation: Joi.string().required(),
    deliveryLocation: Joi.string().required(),
    distanceKm: Joi.number().positive().required()
  }).optional()
});

export const createInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = invoiceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { clientId, dueDate, items, notes, invoiceType, currency, discountAmount, taxes } = value;

    // 1. Verify target client is mapped inside active tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: req.tenant.id }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found in workspace' });
    }

    // 2. Compute dynamic item line calculations
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

    // 3. Apply Discount Deductions
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    // 4. Compute Dynamic Taxes (CGST & SGST @ 9% each by default if empty)
    const taxLines: any[] = [];
    let calculatedTaxTotal = 0;

    if (taxes && taxes.length > 0) {
      for (const t of taxes) {
        const amount = discountedSubtotal * (t.rate / 100);
        calculatedTaxTotal += amount;
        taxLines.push({ name: t.name, rate: t.rate, amount });
      }
    } else {
      // Default to 18% GST (9% CGST + 9% SGST)
      const cgstAmount = discountedSubtotal * 0.09;
      const sgstAmount = discountedSubtotal * 0.09;
      calculatedTaxTotal = cgstAmount + sgstAmount;
      taxLines.push(
        { name: 'CGST', rate: 9.0, amount: cgstAmount },
        { name: 'SGST', rate: 9.0, amount: sgstAmount }
      );
    }

    const total = discountedSubtotal + calculatedTaxTotal;

    // 5. Smart UPI QR String & E-Signature Hash Generation
    const upiQrString = `upi://pay?pa=payments@kaasvex&pn=Kaasvex&am=${total.toFixed(2)}&cu=${currency}&tn=Invoice`;
    const signatureHash = `sha256_seal_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

    // 6. Automated invoice numbering (resilient check helper)
    const invoiceNumber = await generateInvoiceNumber();

    // 7. Write multi-tenant entries inside a Transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          dueDate: new Date(dueDate),
          subtotal,
          taxAmount: calculatedTaxTotal,
          total,
          notes: notes || null,
          invoiceType,
          currency,
          discountAmount,
          qrCodeString: upiQrString,
          signatureString: signatureHash,
          organizationId: req.tenant!.id,
          clientId,
          items: {
            create: processedItems
          },
          taxes: {
            create: taxLines
          },
          statusLogs: {
            create: {
              fromStatus: null,
              toStatus: 'DRAFT',
              notes: 'Invoice generated in workspace'
            }
          }
        }
      });

      // Automatically generate E-Way bill if transport details are present
      if (value.transportDetails) {
        const bill = await createEWayBillRecord(tx, inv.id, value.transportDetails);

        // Log compliance audit event
        await tx.complianceAuditLog.create({
          data: {
            organizationId: req.tenant!.id,
            invoiceId: inv.id,
            actionType: 'EWAY_BILL_GENERATION',
            hashChecked: null,
            verificationResult: 'PASS',
            notes: `E-Way Bill ${bill.ewayBillNo} automatically generated during Invoice creation. Transporter: ${value.transportDetails.transporterName}`,
            performedBy: 'Compliance E-Way Bill Auto-Generator'
          }
        });
      }

      // Update client metadata timelines
      await tx.client.update({
        where: { id: clientId },
        data: {
          lastInvoiceDate: new Date()
        }
      });

      // Fetch invoice with full relations including generated ewayBill
      return await tx.invoice.findFirst({
        where: { id: inv.id },
        include: {
          client: true,
          items: true,
          taxes: true,
          ewayBill: true
        }
      });
    });

    res.status(201).json({
      message: 'Invoice successfully registered.',
      invoice
    });
  } catch (error) {
    console.error('Core invoice creation error:', error);
    res.status(500).json({ error: 'Internal billing engine failure' });
  }
};

export const getInvoices = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        client: true,
        items: true,
        taxes: true,
        ewayBill: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: {
        client: true,
        items: true,
        taxes: true,
        ewayBill: true,
        organization: { select: { name: true } },
        statusLogs: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    // Trigger state transition to VIEWED on retrieval if in DRAFT or SENT
    if (invoice.status === 'DRAFT' || invoice.status === 'SENT') {
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id },
          data: { status: 'VIEWED' }
        }),
        prisma.invoiceStatusLog.create({
          data: {
            invoiceId: id,
            fromStatus: invoice.status,
            toStatus: 'VIEWED',
            notes: 'Invoice opened and viewed by recipient'
          }
        })
      ]);
      invoice.status = 'VIEWED';
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: {
        client: true,
        items: true,
        taxes: true,
        ewayBill: true,
        organization: { select: { name: true } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendInvoice = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: {
        client: true,
        items: true,
        taxes: true,
        ewayBill: true,
        organization: { select: { name: true } }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    // Dispatch stylized emails
    await sendInvoiceEmail(invoice, pdfBuffer);

    // Update status to SENT and log state audit
    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: 'SENT' }
      }),
      prisma.invoiceStatusLog.create({
        data: {
          invoiceId: id,
          fromStatus: invoice.status,
          toStatus: 'SENT',
          notes: 'Invoice successfully dispatched to client email'
        }
      })
    ]);

    // Queue notification dispatch for the event
    await queueNotification({
      organizationId: req.tenant.id,
      event: 'INVOICE_SENT',
      recipient: invoice.client.email,
      content: `Invoice ${invoice.invoiceNumber} for ₹${invoice.total.toLocaleString('en-IN')} has been dispatched.`
    });

    res.json({ message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const ewayBillSchema = Joi.object({
  transporterName: Joi.string().required(),
  transporterId: Joi.string().required(),
  vehicleNo: Joi.string().required(),
  transportMode: Joi.string().valid('Road', 'Rail', 'Air', 'Ship').required(),
  dispatchLocation: Joi.string().required(),
  deliveryLocation: Joi.string().required(),
  distanceKm: Joi.number().positive().required()
});

const ewayBillUpdateSchema = Joi.object({
  transporterName: Joi.string().optional(),
  transporterId: Joi.string().optional(),
  vehicleNo: Joi.string().optional(),
  transportMode: Joi.string().valid('Road', 'Rail', 'Air', 'Ship').optional(),
  dispatchLocation: Joi.string().optional(),
  deliveryLocation: Joi.string().optional(),
  distanceKm: Joi.number().positive().optional(),
  status: Joi.string().valid('Generated', 'In Transit', 'Delivered', 'Cancelled').optional()
});

export const generateEWayBill = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const { error, value } = ewayBillSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: { ewayBill: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    if (invoice.ewayBill) {
      return res.status(400).json({ error: 'E-Way Bill has already been generated for this invoice' });
    }

    const ewayBill = await prisma.$transaction(async (tx) => {
      // 1. Create EWayBill entry using service
      const bill = await createEWayBillRecord(tx, id, value);

      // 2. Log compliance audit event
      await tx.complianceAuditLog.create({
        data: {
          organizationId: req.tenant!.id,
          invoiceId: id,
          actionType: 'EWAY_BILL_GENERATION',
          hashChecked: null,
          verificationResult: 'PASS',
          notes: `E-Way Bill ${bill.ewayBillNo} generated for Invoice ${invoice.invoiceNumber}. Transporter: ${value.transporterName}`,
          performedBy: 'Compliance E-Way Bill Generator'
        }
      });

      return bill;
    });

    res.status(201).json({
      message: 'E-Way Bill successfully generated.',
      ewayBill
    });
  } catch (error) {
    console.error('Generate E-Way Bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEWayBill = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;

    const { error, value } = ewayBillUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: { ewayBill: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    if (!invoice.ewayBill) {
      return res.status(404).json({ error: 'No associated E-Way Bill found for this invoice. Please generate one first.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const bill = await tx.eWayBill.update({
        where: { invoiceId: id },
        data: value
      });

      // Log compliance audit status change
      await tx.complianceAuditLog.create({
        data: {
          organizationId: req.tenant!.id,
          invoiceId: id,
          actionType: 'EWAY_BILL_UPDATE',
          hashChecked: null,
          verificationResult: 'PASS',
          notes: `E-Way Bill ${bill.ewayBillNo} updated. Status: ${bill.status}. Vehicle: ${bill.vehicleNo}`,
          performedBy: 'Compliance E-Way Bill lifecycle updater'
        }
      });

      return bill;
    });

    res.json({
      message: 'E-Way Bill updated successfully.',
      ewayBill: updated
    });
  } catch (error) {
    console.error('Update E-Way Bill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};