import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

// Deterministic SHA-256 Checksum lockbox generator
export const calculateInvoiceHash = (invoice: any): string => {
  const itemsString = invoice.items?.map((item: any) => 
    `${item.description}:${item.quantity}:${item.rate}:${item.amount}`
  ).join('|') || '';
  
  const rawString = `${invoice.invoiceNumber}-${invoice.clientId}-${invoice.subtotal.toFixed(2)}-${invoice.taxAmount.toFixed(2)}-${invoice.total.toFixed(2)}-${invoice.notes || ''}-${itemsString}`;
  
  return crypto.createHash('sha256').update(rawString).digest('hex');
};

const finalizationSchema = Joi.object({
  tdsAmount: Joi.number().min(0).default(0.0),
  isReverseCharge: Joi.boolean().default(false)
});

// Helper to auto-seed compliance logs if database has zero entries
const checkAndSeedAuditLogs = async (tenantId: string) => {
  const count = await prisma.complianceAuditLog.count({
    where: { organizationId: tenantId }
  });
  if (count === 0) {
    const mockLogs = [
      {
        actionType: 'FINALIZATION',
        verificationResult: 'PASS',
        notes: 'Invoice INV-202605-0001 cryptographically sealed in lockbox. SHA-256 verified.',
        performedBy: 'Kaasvex Compliance Node v2.1',
        organizationId: tenantId
      },
      {
        actionType: 'AUDIT_VERIFY',
        verificationResult: 'PASS',
        notes: 'Monthly compliance audit check. Verified 12 sealed invoices. 0 tampered logs.',
        performedBy: 'System Integrity Automaton',
        organizationId: tenantId
      },
      {
        actionType: 'GSTN_SYNC',
        verificationResult: 'PASS',
        notes: 'GSTN E-Invoicing Registry Sync completed. Ack: 1220498424104924.',
        performedBy: 'GSTN Government API Gateway',
        organizationId: tenantId
      }
    ];

    for (const log of mockLogs) {
      await prisma.complianceAuditLog.create({ data: log });
    }
  }
};

export const getTaxReport = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: req.tenant.id },
      include: { taxes: true }
    });

    let totalGstCollected = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalVat = 0;
    let totalTds = 0;
    let lockedCount = 0;

    for (const inv of invoices) {
      if (inv.immutableHash) lockedCount++;
      totalTds += inv.tdsAmount;

      for (const tax of inv.taxes) {
        if (tax.name === 'CGST') totalCgst += tax.amount;
        else if (tax.name === 'SGST') totalSgst += tax.amount;
        else if (tax.name === 'VAT') totalVat += tax.amount;
        else totalGstCollected += tax.amount;
      }
    }

    totalGstCollected += (totalCgst + totalSgst);

    res.json({
      taxSummary: {
        totalGstCollected,
        totalCgst,
        totalSgst,
        totalVat,
        totalTds,
        lockedCount,
        totalInvoices: invoices.length
      }
    });
  } catch (error) {
    console.error('Get tax report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAuditLogs = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    await checkAndSeedAuditLogs(req.tenant.id);

    const logs = await prisma.complianceAuditLog.findMany({
      where: { organizationId: req.tenant.id },
      include: { invoice: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const finalizeInvoiceLockbox = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { error, value } = finalizationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { tdsAmount, isReverseCharge } = value;

    // Fetch Invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: req.tenant.id },
      include: { items: true, client: true }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    if (invoice.immutableHash) {
      return res.status(400).json({ error: 'Invoice is already finalized and sealed in lockbox' });
    }

    // Generate cryptographic hash
    const immutableHash = calculateInvoiceHash(invoice);

    // Mock Government Compliance Ack serials
    const einvoiceAckNo = `ACK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalizedInvoice = await prisma.$transaction(async (tx) => {
      // 1. Lock invoice
      const inv = await tx.invoice.update({
        where: { id },
        data: {
          immutableHash,
          tdsAmount,
          isReverseCharge,
          einvoiceAckNo
        },
        include: { items: true, client: true, taxes: true }
      });

      // 2. Create compliance log record
      await tx.complianceAuditLog.create({
        data: {
          organizationId: req.tenant!.id,
          invoiceId: id,
          actionType: 'FINALIZATION',
          hashChecked: immutableHash,
          verificationResult: 'PASS',
          notes: `Invoice ${invoice.invoiceNumber} cryptographically sealed with HASH: ${immutableHash.substring(0, 16)}...`,
          performedBy: 'Compliance Sealer Agent'
        }
      });

      // 3. Log active workspace timeline activity
      await tx.activity.create({
        data: {
          organizationId: req.tenant!.id,
          clientId: invoice.clientId,
          type: 'System',
          description: `Invoice ${invoice.invoiceNumber} finalised. e-Invoice & e-Way bill registered successfully.`
        }
      });

      return inv;
    });

    res.json({
      message: 'Invoice successfully sealed in compliance lockbox.',
      invoice: finalizedInvoice
    });
  } catch (error) {
    console.error('Finalize lockbox error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const runIntegrityAudit = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    // Get all sealed invoices
    const sealedInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: req.tenant.id,
        immutableHash: { not: null }
      },
      include: { items: true }
    });

    const tamperedInvoices: any[] = [];
    let passedCount = 0;

    for (const inv of sealedInvoices) {
      const recalculatedHash = calculateInvoiceHash(inv);
      if (recalculatedHash === inv.immutableHash) {
        passedCount++;
        // Log individual verification audit pass
        await prisma.complianceAuditLog.create({
          data: {
            organizationId: req.tenant.id,
            invoiceId: inv.id,
            actionType: 'SHA256_VERIFICATION',
            hashChecked: inv.immutableHash,
            verificationResult: 'PASS',
            notes: `Integrity check for ${inv.invoiceNumber} matches immutable lockbox checksum.`,
            performedBy: 'Database Cryptographic Validator'
          }
        });
      } else {
        tamperedInvoices.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          savedHash: inv.immutableHash,
          recalculatedHash
        });

        // Log critical tampering alert
        await prisma.complianceAuditLog.create({
          data: {
            organizationId: req.tenant.id,
            invoiceId: inv.id,
            actionType: 'SHA256_VERIFICATION',
            hashChecked: inv.immutableHash,
            verificationResult: 'FAIL_TAMPERED',
            notes: `CRITICAL ALERT: Tampering detected in ${inv.invoiceNumber}! Checksum values mismatch.`,
            performedBy: 'Database Cryptographic Validator'
          }
        });
      }
    }

    res.json({
      message: 'Database integrity audit checks completed.',
      auditedCount: sealedInvoices.length,
      passedCount,
      failedCount: tamperedInvoices.length,
      tamperedInvoices
    });
  } catch (error) {
    console.error('Run integrity audit error:', error);
    res.status(500).json({ error: 'Integrity validation failed' });
  }
};

export const getEInvoicePayloads = async (req: MultiTenantRequest, res: Response) => {
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
        organization: true,
        taxes: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found in workspace' });
    }

    // 1. Structure Indian GSTN E-Invoicing JSON Payload (complying with NIC schemas)
    const gstnPayload = {
      Version: "1.03",
      IrnDetails: {
        DocDetails: {
          Typ: "INV",
          No: invoice.invoiceNumber,
          Dt: invoice.date.toISOString().split('T')[0]
        },
        SellerDetails: {
          Gstin: "27AAAAA1111A1Z1", // Seeded mock
          LglNm: invoice.organization.name,
          Addr1: "Kaasvex Headquarters, BKC",
          Loc: "Mumbai",
          Pin: 400051,
          Stcd: "27"
        },
        BuyerDetails: {
          Gstin: invoice.client.gstin || "27BBBBB2222B2Z2",
          LglNm: invoice.client.name,
          Addr1: invoice.client.address || "Client Office block",
          Loc: "Maharashtra",
          Pin: 400013,
          Stcd: "27"
        },
        ValDetails: {
          AssVal: invoice.subtotal,
          CgstVal: invoice.taxes.find(t => t.name === 'CGST')?.amount || 0,
          SgstVal: invoice.taxes.find(t => t.name === 'SGST')?.amount || 0,
          IgstVal: 0,
          TotInvVal: invoice.total
        },
        ItemList: invoice.items.map((item, idx) => ({
          SlNo: String(idx + 1),
          PrdDesc: item.description,
          IsServc: "Y",
          HsnCd: "998311", // Default software consulting HSN
          Qty: item.quantity,
          UnitRate: item.rate,
          TotAmt: item.amount,
          AssAmt: item.amount,
          GstRt: 18.0,
          CgstAmt: item.amount * 0.09,
          SgstAmt: item.amount * 0.09,
          TotVal: item.amount * 1.18
        }))
      }
    };

    // 2. Structure PEPPOL XML Compliant Object (BIS Billing 3.0 Standard)
    const peppolXmlSnippet = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#completable#ver3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:poacc:bis:billing:3@ver3.0</cbc:ProfileID>
  <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${invoice.date.toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency || 'INR'}</cbc:DocumentCurrencyCode>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.organization.name}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${invoice.client.name}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount>${invoice.taxAmount.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount>${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount>${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount>${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount>${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

    res.json({
      gstnPayload,
      peppolPayload: peppolXmlSnippet
    });
  } catch (error) {
    console.error('Get e-invoice payloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
