// Comprehensive billing seed — 22 invoices (incl. 3 vendor bills), 18+ payments, 10 quotes, 5 recurring.
declare const process: any;
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const d = new Date();
const ago = (n: number) => new Date(d.getTime() - n * 86400000);
const later = (n: number) => new Date(d.getTime() + n * 86400000);

const CUSTOMER_IDS: Record<string, number> = {
  "Meridian Foods": 1, "Cirrus Aviation": 2, "Halcyon Media": 3,
  "Orbit Health": 4, "Bristow Textiles": 5, "Apex Logistics Group": 6,
  "Vortex Energy Solutions": 7, "Nimbus Technologies": 8,
  "Solara Renewable Energy": 9, "Cascade Water Solutions": 10,
  "Pinnacle Realty Group": 11, "Neuron AI Research": 12,
  "Gardenia Organic Farms": 13, "Titan Defence Systems": 14,
  "Velora Hospitality": 15, "Oceanic Pharmaceuticals": 16,
  "Bright Future Education": 17, "Everest Logistics": 18,
  "Starlight Entertainment": 19, "Delta Automotive": 20,
};

const VENDOR_IDS: Record<string, number> = {
  "Siemens India Limited": 1, "Schneider Electric India": 2,
  "Philips India Ltd": 3, "Omron Automation Pvt Ltd": 4,
  "Honeywell Automation India": 5, "Legrand India Pvt Ltd": 6,
  "Bosch Power Tools India": 7, "Havells India Limited": 8,
};

function cid(name: string): number { return CUSTOMER_IDS[name]; }
function vid(name: string): number { return VENDOR_IDS[name]; }

interface InvDef {
  organizationId: number; type: "receivable" | "payable";
  clientId?: number; clientName?: string;
  vendorId?: number; vendorName?: string;
  invoiceNumber: string; status: "draft"|"sent"|"paid"|"partially_paid"|"overdue"|"void";
  issueDate: Date|null; dueDate: Date|null;
  gstTreatment: "intrastate"|"interstate"; placeOfSupply: string;
  subtotal: number; discount: number; discountType?: string;
  cgst: number; sgst: number; igst: number;
  taxTotal: number; total: number; paidAmount: number; balanceDue: number;
  items: { productId: number|null; description: string; quantity: number; unitPrice: number; gstRate: number; amount: number }[];
}

interface PayDef {
  organizationId: number; invoiceId: number|null; amount: number;
  paymentMethod: "Bank_Transfer"|"UPI"|"Credit_Card"|"Cheque"|"Cash";
  paymentDate: Date; referenceId: string; notes: string; status: "pending"|"cleared"|"failed"|"refunded";
}

async function main() {
  console.log("Cleaning up existing billing database records...");
  await prisma.reconciliationAuditLog.deleteMany().catch(() => {});
  await prisma.bankTransaction.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.invoiceItem.deleteMany().catch(() => {});
  await prisma.creditNote.deleteMany().catch(() => {});
  await prisma.debitNote.deleteMany().catch(() => {});
  await prisma.dunningRecord.deleteMany().catch(() => {});
  await prisma.quotation.deleteMany().catch(() => {});
  await prisma.recurringInvoice.deleteMany().catch(() => {});
  await prisma.invoice.deleteMany().catch(() => {});
  await prisma.ledgerEntry.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.accountMapping.deleteMany().catch(() => {});
  await prisma.account.deleteMany().catch(() => {});
  await prisma.closeSignOff.deleteMany().catch(() => {});
  await prisma.closeAuditLog.deleteMany().catch(() => {});
  await prisma.fiscalPeriod.deleteMany().catch(() => {});
  await prisma.reconciliationToleranceRule.deleteMany().catch(() => {});

  console.log("Seeding billing database with 22 invoices (19 receivable + 3 vendor bills)...");

  // ── INVOICES (22) ─────────────────────────────────────────────────
  const invoices: InvDef[] = [
    // ── RECEIVABLE INVOICES (19) ──
    // 1 - Meridian Foods (paid)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0001",
      status: "paid", issueDate: ago(60), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 150000, discount: 0, cgst: 13500, sgst: 13500, igst: 0, taxTotal: 27000, total: 177000, paidAmount: 162000, balanceDue: 0,
      items: [
        { productId: null, description: "Industrial Automation Controller X200 (5 units)", quantity: 5, unitPrice: 25000, gstRate: 18, amount: 125000 },
        { productId: null, description: "Sensor Array Kit — Proximity (10 units)", quantity: 10, unitPrice: 2500, gstRate: 18, amount: 25000 },
      ]},
    // 2 - Cirrus Aviation (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", invoiceNumber: "INV-202608-0002",
      status: "sent", issueDate: ago(30), dueDate: later(0),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 420000, discount: 0, cgst: 0, sgst: 0, igst: 75600, taxTotal: 75600, total: 507600, paidAmount: 0, balanceDue: 507600,
      items: [
        { productId: null, description: "Aviation-Grade Telemetry Module (3 units)", quantity: 3, unitPrice: 120000, gstRate: 18, amount: 360000 },
        { productId: null, description: "Flight Data Recorder Interface (2 units)", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 },
      ]},
    // 3 - Halcyon Media (overdue)
    { organizationId: 1, type: "receivable", clientId: cid("Halcyon Media"), clientName: "Halcyon Media", invoiceNumber: "INV-202608-0003",
      status: "overdue", issueDate: ago(90), dueDate: ago(60),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 85000, discount: 0, cgst: 7650, sgst: 7650, igst: 0, taxTotal: 15300, total: 100300, paidAmount: 50000, balanceDue: 42000,
      items: [
        { productId: null, description: "Content Delivery Network Setup (1 year)", quantity: 1, unitPrice: 55000, gstRate: 18, amount: 55000 },
        { productId: null, description: "Media Asset Management License (annual)", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 },
      ]},
    // 4 - Orbit Health (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-202608-0004",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 230000, discount: 25000, discountType: "fixed", cgst: 18450, sgst: 18450, igst: 0, taxTotal: 36900, total: 241900, paidAmount: 0, balanceDue: 241900,
      items: [
        { productId: null, description: "Healthcare Data Platform — Base License", quantity: 1, unitPrice: 180000, gstRate: 18, amount: 180000 },
        { productId: null, description: "Patient Portal Integration Services", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
      ]},
    // 5 - Bristow Textiles (partially_paid)
    { organizationId: 1, type: "receivable", clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", invoiceNumber: "INV-202608-0005",
      status: "partially_paid", issueDate: ago(15), dueDate: later(15),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 310000, discount: 0, cgst: 0, sgst: 0, igst: 55800, taxTotal: 55800, total: 365800, paidAmount: 150000, balanceDue: 203300,
      items: [
        { productId: null, description: "ERP Manufacturing Module — Textile Edition", quantity: 1, unitPrice: 250000, gstRate: 18, amount: 250000 },
        { productId: null, description: "Implementation & Training (40 hours)", quantity: 40, unitPrice: 1500, gstRate: 18, amount: 60000 },
      ]},
    // 6 - Meridian Foods (void — was cancelled)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0006",
      status: "void", issueDate: ago(120), dueDate: ago(105),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 75000, discount: 0, cgst: 6750, sgst: 6750, igst: 0, taxTotal: 13500, total: 88500, paidAmount: 0, balanceDue: 0,
      items: [
        { productId: null, description: "Warehouse Automation Feasibility Study", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
      ]},
    // 7 - Nimbus Technologies (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", invoiceNumber: "INV-202608-0007",
      status: "sent", issueDate: ago(10), dueDate: later(20),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 346000, discount: 0, cgst: 31140, sgst: 31140, igst: 0, taxTotal: 62280, total: 408280, paidAmount: 0, balanceDue: 408280,
      items: [
        { productId: null, description: "Cloud Migration Suite — Enterprise Edition", quantity: 1, unitPrice: 280000, gstRate: 18, amount: 280000 },
        { productId: null, description: "Data Migration Services (80 hours)", quantity: 80, unitPrice: 825, gstRate: 18, amount: 66000 },
      ]},
    // 8 - Solara Renewable (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-202608-0008",
      status: "sent", issueDate: ago(3), dueDate: later(27),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 525800, discount: 0, cgst: 47322, sgst: 47322, igst: 0, taxTotal: 94644, total: 620444, paidAmount: 0, balanceDue: 620444,
      items: [
        { productId: null, description: "SCADA System — Solar Plant Edition", quantity: 1, unitPrice: 420000, gstRate: 18, amount: 420000 },
        { productId: null, description: "IoT Sensor Gateway (15 units)", quantity: 15, unitPrice: 3200, gstRate: 18, amount: 48000 },
        { productId: null, description: "On-site Commissioning (40 hours)", quantity: 40, unitPrice: 1445, gstRate: 18, amount: 57800 },
      ]},
    // 9 - Titan Defence (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-202608-0009",
      status: "sent", issueDate: ago(20), dueDate: later(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 697500, discount: 0, cgst: 0, sgst: 0, igst: 125550, taxTotal: 125550, total: 848050, paidAmount: 0, balanceDue: 848050,
      items: [
        { productId: null, description: "Secure Communications Suite — Classified", quantity: 1, unitPrice: 550000, gstRate: 18, amount: 550000 },
        { productId: null, description: "FIPS 140-3 Compliance Module", quantity: 1, unitPrice: 87500, gstRate: 18, amount: 87500 },
        { productId: null, description: "Security Audit & Penetration Testing", quantity: 1, unitPrice: 60000, gstRate: 18, amount: 60000 },
      ]},
    // 10 - Pinnacle Realty (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", invoiceNumber: "INV-202608-0010",
      status: "sent", issueDate: ago(7), dueDate: later(23),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 165400, discount: 10000, discountType: "fixed", cgst: 13986, sgst: 13986, igst: 0, taxTotal: 27972, total: 183372, paidAmount: 0, balanceDue: 183372,
      items: [
        { productId: null, description: "PropTech Platform — Annual License", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Property Listing Import & Migration", quantity: 1, unitPrice: 25000, gstRate: 18, amount: 25000 },
        { productId: null, description: "CRM Data Migration Services", quantity: 20, unitPrice: 1020, gstRate: 18, amount: 20400 },
      ]},
    // 11 - Delta Automotive (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Delta Automotive"), clientName: "Delta Automotive", invoiceNumber: "INV-202608-0011",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 265000, discount: 0, cgst: 0, sgst: 0, igst: 47700, taxTotal: 47700, total: 312700, paidAmount: 0, balanceDue: 312700,
      items: [
        { productId: null, description: "MES Platform — Automotive Edition", quantity: 1, unitPrice: 220000, gstRate: 18, amount: 220000 },
        { productId: null, description: "SAP Integration Adapter", quantity: 1, unitPrice: 45000, gstRate: 18, amount: 45000 },
      ]},
    // 12 - Oceanic Pharmaceuticals (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", invoiceNumber: "INV-202608-0012",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 753800, discount: 0, cgst: 67842, sgst: 67842, igst: 0, taxTotal: 135684, total: 889484, paidAmount: 0, balanceDue: 889484,
      items: [
        { productId: null, description: "GxP Compliance Suite — Full License", quantity: 1, unitPrice: 580000, gstRate: 18, amount: 580000 },
        { productId: null, description: "GxP Validation Services Package", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Electronic Signature Module", quantity: 1, unitPrice: 53800, gstRate: 18, amount: 53800 },
      ]},
    // 13 - Everest Logistics (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Everest Logistics"), clientName: "Everest Logistics", invoiceNumber: "INV-202608-0013",
      status: "sent", issueDate: ago(12), dueDate: later(18),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 207600, discount: 0, cgst: 0, sgst: 0, igst: 37368, taxTotal: 37368, total: 244968, paidAmount: 0, balanceDue: 244968,
      items: [
        { productId: null, description: "WMS Platform — Logistics Edition", quantity: 1, unitPrice: 160000, gstRate: 18, amount: 160000 },
        { productId: null, description: "EDI Integration Setup", quantity: 1, unitPrice: 35000, gstRate: 18, amount: 35000 },
        { productId: null, description: "Mobile App — Warehouse Scanner", quantity: 1, unitPrice: 12600, gstRate: 18, amount: 12600 },
      ]},
    // 14 - Velora Hospitality (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Velora Hospitality"), clientName: "Velora Hospitality", invoiceNumber: "INV-202608-0014",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 114000, discount: 0, cgst: 10260, sgst: 10260, igst: 0, taxTotal: 20520, total: 134520, paidAmount: 0, balanceDue: 134520,
      items: [
        { productId: null, description: "Hotel PMS Software — Base License", quantity: 1, unitPrice: 85000, gstRate: 18, amount: 85000 },
        { productId: null, description: "Channel Manager Integration", quantity: 1, unitPrice: 29000, gstRate: 18, amount: 29000 },
      ]},
    // 15 - Meridian Foods (sent — additional)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0015",
      status: "sent", issueDate: ago(4), dueDate: later(26),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 106000, discount: 0, cgst: 9540, sgst: 9540, igst: 0, taxTotal: 19080, total: 125080, paidAmount: 0, balanceDue: 125080,
      items: [
        { productId: null, description: "Advanced Analytics Add-on Module", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
        { productId: null, description: "Dashboards & Reports (10 custom)", quantity: 10, unitPrice: 3100, gstRate: 18, amount: 31000 },
      ]},
    // 16 - Starlight Entertainment (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Starlight Entertainment"), clientName: "Starlight Entertainment", invoiceNumber: "INV-202608-0016",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 66100, discount: 0, cgst: 5949, sgst: 5949, igst: 0, taxTotal: 11898, total: 77998, paidAmount: 0, balanceDue: 77998,
      items: [
        { productId: null, description: "Digital Asset Management Platform", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
        { productId: null, description: "Media Encoding Pipeline Setup", quantity: 1, unitPrice: 18100, gstRate: 18, amount: 18100 },
      ]},
    // 17 - Apex Logistics (paid)
    { organizationId: 1, type: "receivable", clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", invoiceNumber: "INV-202608-0017",
      status: "paid", issueDate: ago(45), dueDate: ago(15),
      gstTreatment: "interstate", placeOfSupply: "Gujarat",
      subtotal: 85000, discount: 0, cgst: 0, sgst: 0, igst: 15300, taxTotal: 15300, total: 100300, paidAmount: 100300, balanceDue: 0,
      items: [
        { productId: null, description: "Transport Management System — Basic", quantity: 1, unitPrice: 70000, gstRate: 18, amount: 70000 },
        { productId: null, description: "GPS Tracking Integration", quantity: 1, unitPrice: 15000, gstRate: 18, amount: 15000 },
      ]},
    // 18 - Titan Defence (partially paid)
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-202608-0018",
      status: "partially_paid", issueDate: ago(40), dueDate: ago(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 380000, discount: 0, cgst: 0, sgst: 0, igst: 68400, taxTotal: 68400, total: 448400, paidAmount: 200000, balanceDue: 248400,
      items: [
        { productId: null, description: "Secure Data Center — Rack Integration", quantity: 2, unitPrice: 150000, gstRate: 18, amount: 300000 },
        { productId: null, description: "Hardware Security Module (HSM)", quantity: 2, unitPrice: 40000, gstRate: 18, amount: 80000 },
      ]},
    // 19 - Orbit Health (overdue — repeat)
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-202608-0019",
      status: "overdue", issueDate: ago(75), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 152000, discount: 0, cgst: 13680, sgst: 13680, igst: 0, taxTotal: 27360, total: 179360, paidAmount: 0, balanceDue: 159360,
      items: [
        { productId: null, description: "EHR Data Migration (Phase 1)", quantity: 1, unitPrice: 95000, gstRate: 18, amount: 95000 },
        { productId: null, description: "Legacy System Integration — HL7", quantity: 1, unitPrice: 57000, gstRate: 18, amount: 57000 },
      ]},
    // 20 - Solara Renewable (partially_paid)
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-202608-0020",
      status: "partially_paid", issueDate: ago(25), dueDate: later(5),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 198000, discount: 5000, discountType: "percentage", cgst: 17370, sgst: 17370, igst: 0, taxTotal: 34740, total: 245740, paidAmount: 100000, balanceDue: 145740,
      items: [
        { productId: null, description: "Solar Farm Monitoring — 50MW License", quantity: 1, unitPrice: 150000, gstRate: 18, amount: 150000 },
        { productId: null, description: "Weather Station Integration", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
      ]},

    // ── VENDOR BILLS (3 — payable) ──
    // 21 - Siemens India Limited vendor bill (draft)
    { organizationId: 1, type: "payable",
      vendorId: vid("Siemens India Limited"), vendorName: "Siemens India Limited",
      invoiceNumber: "INV-202608-0021",
      status: "draft", issueDate: ago(5), dueDate: later(25),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 425000, discount: 0, cgst: 0, sgst: 0, igst: 76500, taxTotal: 76500, total: 501500, paidAmount: 0, balanceDue: 501500,
      items: [
        { productId: null, description: "PLC CPU Module — Siemens S7-1200 (300 units)", quantity: 300, unitPrice: 1250, gstRate: 18, amount: 375000 },
        { productId: null, description: "Distributed I/O Interface — Siemens ET200 (50 units)", quantity: 50, unitPrice: 1000, gstRate: 18, amount: 50000 },
      ]},
    // 22 - Schneider Electric India vendor bill (partially paid)
    { organizationId: 1, type: "payable",
      vendorId: vid("Schneider Electric India"), vendorName: "Schneider Electric India",
      invoiceNumber: "INV-202608-0022",
      status: "partially_paid", issueDate: ago(20), dueDate: later(10),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 180000, discount: 0, cgst: 8100, sgst: 8100, igst: 0, taxTotal: 16200, total: 196200, paidAmount: 100000, balanceDue: 96200,
      items: [
        { productId: null, description: "Industrial Controller X200 — Schneider Modicon (400 units)", quantity: 400, unitPrice: 450, gstRate: 5, amount: 180000 },
      ]},
    // 23 - Omron Automation Pvt Ltd vendor bill (sent)
    { organizationId: 1, type: "payable",
      vendorId: vid("Omron Automation Pvt Ltd"), vendorName: "Omron Automation Pvt Ltd",
      invoiceNumber: "INV-202608-0023",
      status: "sent", issueDate: ago(8), dueDate: later(22),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 168000, discount: 8000, discountType: "fixed", cgst: 14400, sgst: 14400, igst: 0, taxTotal: 28800, total: 188800, paidAmount: 0, balanceDue: 188800,
      items: [
        { productId: null, description: "Photoelectric Sensor — Omron E3Z (60 units)", quantity: 60, unitPrice: 2800, gstRate: 18, amount: 168000 },
      ]},
  ];

  const createdInvoices: { id: number; invNum: string; status: string; total: number; type: string }[] = [];

  for (const inv of invoices) {
    const { items, ...invData } = inv;
    const created = await prisma.invoice.create({
      data: { ...invData, items: { create: items } },
    });
    createdInvoices.push({ id: created.id, invNum: created.invoiceNumber ?? "", status: created.status, total: Number(created.total), type: created.type });
    console.log(`  Invoice ${created.invoiceNumber} (${created.status} - ${created.type})`);
  }

  // ── PAYMENTS (18) ────────────────────────────────────────────────
  const payments: PayDef[] = [
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 162000, paymentMethod: "Bank_Transfer", paymentDate: ago(50), referenceId: "NEFT-MF-001", notes: "Full payment INV-202608-0001 (adjusted for credit note)", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50000, paymentMethod: "UPI", paymentDate: ago(55), referenceId: "UPI-HM-001", notes: "Partial payment INV-202608-0003", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50300, paymentMethod: "Cheque", paymentDate: ago(5), referenceId: "CHQ-HM-002", notes: "Overdue payment INV-202608-0003 — bounced", status: "failed" },
    { organizationId: 1, invoiceId: createdInvoices[4].id, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(5), referenceId: "NEFT-BT-001", notes: "Partial payment INV-202608-0005", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[16].id, amount: 100300, paymentMethod: "UPI", paymentDate: ago(20), referenceId: "UPI-AL-001", notes: "Full payment INV-202608-0017", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[17].id, amount: 200000, paymentMethod: "Bank_Transfer", paymentDate: ago(20), referenceId: "NEFT-TD-001", notes: "Partial payment INV-202608-0018", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[19].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-SR-001", notes: "Partial payment INV-202608-0020", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 177000, paymentMethod: "Credit_Card", paymentDate: ago(48), referenceId: "CC-MF-001", notes: "Duplicate payment — refunded", status: "refunded" },
    { organizationId: 1, invoiceId: createdInvoices[21].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-UC-001", notes: "Partial payment INV-202608-0022", status: "cleared" },
    // Standalone payments
    { organizationId: 1, invoiceId: null, amount: 25000, paymentMethod: "UPI", paymentDate: ago(3), referenceId: "UPI-ADV-001", notes: "Advance payment — new project", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 50000, paymentMethod: "Credit_Card", paymentDate: ago(7), referenceId: "CC-ADV-001", notes: "Subscription renewal — annual", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(2), referenceId: "NEFT-MISC-001", notes: "Invoice INV-202608-0002 partial", status: "failed" },
    { organizationId: 1, invoiceId: null, amount: 12000, paymentMethod: "Cash", paymentDate: ago(10), referenceId: "CASH-001", notes: "Walk-in — software license purchase", status: "refunded" },
    { organizationId: 1, invoiceId: null, amount: 75000, paymentMethod: "Bank_Transfer", paymentDate: ago(1), referenceId: "NEFT-RETAINER-001", notes: "Q3 retainer — Meridian Foods", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 32000, paymentMethod: "UPI", paymentDate: ago(4), referenceId: "UPI-CONSULT-001", notes: "Consulting fees — Cirrus Aviation", status: "pending" },
    { organizationId: 1, invoiceId: null, amount: 88000, paymentMethod: "Cheque", paymentDate: ago(8), referenceId: "CHQ-ORBIT-001", notes: "Orbit Health milestone payment", status: "pending" },
    { organizationId: 1, invoiceId: null, amount: 15000, paymentMethod: "UPI", paymentDate: ago(0), referenceId: "UPI-EXP-001", notes: "Expense reimbursement", status: "pending" },
  ];

  for (const p of payments) {
    const pay = await prisma.payment.create({ data: p });
    console.log(`  Payment ${pay.referenceId} (${pay.status})`);
  }

  // ── QUOTATIONS (20) ──────────────────────────────────────────────
  const quotations = [
    {
      organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", quoteNumber: "QT-202608-0001", total: 245000, status: "accepted" as const, issueDate: ago(45), validUntil: ago(15), notes: "Q3 Expansion Contract",
      items: [
        { description: "Industrial Automation Controller X200", quantity: 5, unitPrice: 25000, gstRate: 18, amount: 125000 },
        { description: "Sensor Array Kit — Proximity", quantity: 10, unitPrice: 2500, gstRate: 18, amount: 25000 },
        { description: "HMI Display Panel Touch 10inch", quantity: 3, unitPrice: 30000, gstRate: 18, amount: 90000 },
        { description: "Automation Setup Support", quantity: 5, unitPrice: 1000, gstRate: 18, amount: 5000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", quoteNumber: "QT-202608-0002", total: 510000, status: "sent" as const, issueDate: ago(10), validUntil: later(20), notes: "Fleet-wide telemetry upgrade",
      items: [
        { description: "Aviation-Grade Telemetry Module", quantity: 3, unitPrice: 120000, gstRate: 18, amount: 360000 },
        { description: "Flight Data Recorder Interface", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 },
        { description: "Custom Harness and Antenna Array", quantity: 3, unitPrice: 30000, gstRate: 18, amount: 90000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", quoteNumber: "QT-202608-0003", total: 625000, status: "draft" as const, issueDate: null, validUntil: null, notes: "EHR Platform — Phase 2",
      items: [
        { description: "EHR Platform Base License — Phase 2", quantity: 1, unitPrice: 450000, gstRate: 18, amount: 450000 },
        { description: "HL7 Integration Middleware Suite", quantity: 1, unitPrice: 125000, gstRate: 18, amount: 125000 },
        { description: "Data Migration & Mapping (50 hours)", quantity: 50, unitPrice: 1000, gstRate: 18, amount: 50000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", quoteNumber: "QT-202608-0004", total: 350000, status: "sent" as const, issueDate: ago(8), validUntil: later(22), notes: "Cloud Migration Package",
      items: [
        { description: "Cloud Migration Suite Enterprise", quantity: 1, unitPrice: 280000, gstRate: 18, amount: 280000 },
        { description: "Cloud Security Architecture Advisory", quantity: 1, unitPrice: 70000, gstRate: 18, amount: 70000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", quoteNumber: "QT-202608-0005", total: 480000, status: "draft" as const, issueDate: null, validUntil: null, notes: "Plant SCADA Overhaul",
      items: [
        { description: "SCADA Software Enterprise License", quantity: 1, unitPrice: 350000, gstRate: 18, amount: 350000 },
        { description: "Modbus TCP/IP Master Controller", quantity: 10, unitPrice: 10000, gstRate: 18, amount: 100000 },
        { description: "Integration Services (30 hours)", quantity: 30, unitPrice: 1000, gstRate: 18, amount: 30000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", quoteNumber: "QT-202608-0006", total: 220000, status: "sent" as const, issueDate: ago(5), validUntil: later(25), notes: "PropTech Platform",
      items: [
        { description: "PropTech Portal White-label Setup", quantity: 1, unitPrice: 150000, gstRate: 18, amount: 150000 },
        { description: "Real Estate API Integration Broker", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
        { description: "Agent Training Material & Guides", quantity: 1, unitPrice: 20000, gstRate: 18, amount: 20000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Delta Automotive"), clientName: "Delta Automotive", quoteNumber: "QT-202608-0007", total: 395000, status: "draft" as const, issueDate: null, validUntil: null, notes: "MES Implementation",
      items: [
        { description: "MES Integration Core Module", quantity: 1, unitPrice: 275000, gstRate: 18, amount: 275000 },
        { description: "Automotive CAN-bus Reader Interface", quantity: 8, unitPrice: 15000, gstRate: 18, amount: 120000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", quoteNumber: "QT-202608-0008", total: 780000, status: "sent" as const, issueDate: ago(2), validUntil: later(45), notes: "GxP Compliance Suite",
      items: [
        { description: "GxP Compliance Tracker Suite License", quantity: 1, unitPrice: 600000, gstRate: 18, amount: 600000 },
        { description: "Validation Protocol Run & Report", quantity: 1, unitPrice: 180000, gstRate: 18, amount: 180000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Everest Logistics"), clientName: "Everest Logistics", quoteNumber: "QT-202608-0009", total: 210000, status: "sent" as const, issueDate: ago(6), validUntil: later(24), notes: "WMS Upgrade",
      items: [
        { description: "WMS Upgrade Core Engine License", quantity: 1, unitPrice: 160000, gstRate: 18, amount: 160000 },
        { description: "Barcoding Integration Module API", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", quoteNumber: "QT-202608-0010", total: 98000, status: "rejected" as const, issueDate: ago(30), validUntil: ago(5), notes: "Budget constraints",
      items: [
        { description: "GPS Fleet Tracker Enterprise License", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
        { description: "High-Gain Fleet Antennae", quantity: 23, unitPrice: 1000, gstRate: 18, amount: 23000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Halcyon Media"), clientName: "Halcyon Media", quoteNumber: "QT-202608-0011", total: 310000, status: "accepted" as const, issueDate: ago(15), validUntil: ago(2), notes: "CDN Advanced Edge Cache Config",
      items: [
        { description: "CDN Advanced Edge Cache Config", quantity: 1, unitPrice: 200000, gstRate: 18, amount: 200000 },
        { description: "Ad Server Integration Middleware", quantity: 1, unitPrice: 110000, gstRate: 18, amount: 110000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", quoteNumber: "QT-202608-0012", total: 180000, status: "sent" as const, issueDate: ago(3), validUntil: later(10), notes: "Textile Design CAD Plugin Suite",
      items: [
        { description: "Textile Design CAD Plugin License", quantity: 5, unitPrice: 30000, gstRate: 18, amount: 150000 },
        { description: "Fabric Shader Library Suite", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Vortex Energy Solutions"), clientName: "Vortex Energy Solutions", quoteNumber: "QT-202608-0013", total: 540000, status: "draft" as const, issueDate: null, validUntil: null, notes: "Wind Farm Telemetry Gateway Setup",
      items: [
        { description: "Wind Farm Telemetry Gateway", quantity: 2, unitPrice: 200000, gstRate: 18, amount: 400000 },
        { description: "Grid SCADA Connector License", quantity: 1, unitPrice: 140000, gstRate: 18, amount: 140000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Cascade Water Solutions"), clientName: "Cascade Water Solutions", quoteNumber: "QT-202608-0014", total: 420000, status: "expired" as const, issueDate: ago(40), validUntil: ago(10), notes: "Water Flow Sensor Node Array",
      items: [
        { description: "Water Flow Sensor Node Array", quantity: 20, unitPrice: 15000, gstRate: 18, amount: 300000 },
        { description: "Hydrological Analysis License", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Neuron AI Research"), clientName: "Neuron AI Research", quoteNumber: "QT-202608-0015", total: 950000, status: "accepted" as const, issueDate: ago(12), validUntil: later(18), notes: "GPU Cluster Management Core",
      items: [
        { description: "GPU Cluster Management Core", quantity: 1, unitPrice: 750000, gstRate: 18, amount: 750000 },
        { description: "High-Performance Storage Mount", quantity: 2, unitPrice: 100000, gstRate: 18, amount: 200000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Gardenia Organic Farms"), clientName: "Gardenia Organic Farms", quoteNumber: "QT-202608-0016", total: 290000, status: "sent" as const, issueDate: ago(3), validUntil: later(25), notes: "Automated Irrigation Valve Master",
      items: [
        { description: "Automated Irrigation Valve Master", quantity: 10, unitPrice: 20000, gstRate: 18, amount: 200000 },
        { description: "Soil Moisture Probe Pro Array", quantity: 15, unitPrice: 6000, gstRate: 18, amount: 90000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", quoteNumber: "QT-202608-0017", total: 820000, status: "draft" as const, issueDate: null, validUntil: null, notes: "Radar Signal Processing Engine Design",
      items: [
        { description: "Radar Signal Processing Engine", quantity: 1, unitPrice: 650000, gstRate: 18, amount: 650000 },
        { description: "Hardware-in-the-Loop Simulator", quantity: 1, unitPrice: 170000, gstRate: 18, amount: 170000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Velora Hospitality"), clientName: "Velora Hospitality", quoteNumber: "QT-202608-0018", total: 340000, status: "rejected" as const, issueDate: ago(25), validUntil: ago(5), notes: "PMS Integration API Gateway Proposal",
      items: [
        { description: "PMS Integration API Gateway", quantity: 1, unitPrice: 240000, gstRate: 18, amount: 240000 },
        { description: "Guest Mobile App Portal Setup", quantity: 1, unitPrice: 100000, gstRate: 18, amount: 100000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Bright Future Education"), clientName: "Bright Future Education", quoteNumber: "QT-202608-0019", total: 150000, status: "sent" as const, issueDate: ago(5), validUntil: later(15), notes: "LMS Platform Customization",
      items: [
        { description: "LMS Platform Customization Fee", quantity: 1, unitPrice: 100000, gstRate: 18, amount: 100000 },
        { description: "Teacher/Student Portal Training", quantity: 5, unitPrice: 10000, gstRate: 18, amount: 50000 },
      ]
    },
    {
      organizationId: 1, clientId: cid("Starlight Entertainment"), clientName: "Starlight Entertainment", quoteNumber: "QT-202608-0020", total: 620000, status: "accepted" as const, issueDate: ago(20), validUntil: ago(1), notes: "Event Ticketing Broker API Integration",
      items: [
        { description: "Event Ticketing Broker API", quantity: 1, unitPrice: 480000, gstRate: 18, amount: 480000 },
        { description: "Venue Seating Layout Designer", quantity: 1, unitPrice: 140000, gstRate: 18, amount: 140000 },
      ]
    },
  ];

  for (const q of quotations) {
    await prisma.quotation.create({
      data: {
        organizationId: q.organizationId,
        clientId: q.clientId,
        clientName: q.clientName,
        quoteNumber: q.quoteNumber,
        total: q.total,
        status: q.status,
        issueDate: q.issueDate,
        validUntil: q.validUntil,
        notes: q.notes,
        items: {
          create: q.items
        }
      }
    });
    console.log(`  Quotation ${q.quoteNumber} (${q.status})`);
  }

  // ── CREDIT NOTES (5) ─────────────────────────────────────────────
  const creditNotes = [
    { organizationId: 1, invoiceId: createdInvoices[0].id, creditNoteNumber: "CN-202608-0001", amount: 15000, reason: "Damaged goods returned — Controller X200 unit replaced", status: "issued" as const, issueDate: ago(40) },
    { organizationId: 1, invoiceId: createdInvoices[2].id, creditNoteNumber: "CN-202608-0002", amount: 8300, reason: "Early payment discount (2% on overdue partial)", status: "issued" as const, issueDate: ago(50) },
    { organizationId: 1, invoiceId: createdInvoices[4].id, creditNoteNumber: "CN-202608-0003", amount: 12500, reason: "Service credit — delayed implementation milestone", status: "issued" as const, issueDate: ago(8) },
    { organizationId: 1, invoiceId: createdInvoices[7].id, creditNoteNumber: "CN-202608-0004", amount: 8500, reason: "Shipping damage — IoT sensor gateway (2 units)", status: "draft" as const, issueDate: ago(1) },
    { organizationId: 1, invoiceId: createdInvoices[18].id, creditNoteNumber: "CN-202608-0005", amount: 20000, reason: "Scope reduction — removed HL7 interface module", status: "issued" as const, issueDate: ago(30) },
  ];

  for (const cn of creditNotes) {
    await prisma.creditNote.create({ data: cn });
    console.log(`  Credit note ${cn.creditNoteNumber}`);
  }

  // ── DEBIT NOTES (4) ─────────────────────────────────────────────
  const debitNotes = [
    { organizationId: 1, invoiceId: createdInvoices[1].id, debitNoteNumber: "DN-202608-0001", amount: 12000, reason: "Price adjustment — additional integration modules", status: "issued" as const, issueDate: ago(20) },
    { organizationId: 1, invoiceId: createdInvoices[8].id, debitNoteNumber: "DN-202608-0002", amount: 25000, reason: "Change order — extended pen-testing scope", status: "issued" as const, issueDate: ago(15) },
    { organizationId: 1, invoiceId: createdInvoices[6].id, debitNoteNumber: "DN-202608-0003", amount: 15000, reason: "Additional data migration — extra 20 hrs", status: "draft" as const, issueDate: ago(2) },
    { organizationId: 1, invoiceId: createdInvoices[19].id, debitNoteNumber: "DN-202608-0004", amount: 18000, reason: "Late payment interest (45 days overdue)", status: "issued" as const, issueDate: ago(10) },
  ];

  for (const dn of debitNotes) {
    await prisma.debitNote.create({ data: dn });
    console.log(`  Debit note ${dn.debitNoteNumber}`);
  }

  // ── RECURRING INVOICES (5) ──────────────────────────────────────
  const recurring = [
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", templateName: "Monthly Support Retainer", items: JSON.stringify([{ desc: "Premium Support — 24/7 SLA", qty: 1, rate: 45000 }]), total: 53100, frequency: "monthly" as const, nextRun: later(1), endDate: later(365), autoEmail: true, status: "active" as const },
    { organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", templateName: "EHR Platform Hosting", items: JSON.stringify([{ desc: "Cloud Infrastructure — Dedicated", qty: 1, rate: 85000 }, { desc: "Database Managed Service", qty: 1, rate: 25000 }]), total: 129800, frequency: "monthly" as const, nextRun: later(5), endDate: null, autoEmail: true, status: "active" as const },
    { organizationId: 1, clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", templateName: "Cloud Infrastructure Hosting", items: JSON.stringify([{ desc: "AWS Reserved Instances — 12-month", qty: 1, rate: 42000 }, { desc: "Managed Kubernetes Cluster", qty: 1, rate: 18000 }]), total: 70800, frequency: "monthly" as const, nextRun: later(10), endDate: later(365), autoEmail: false, status: "active" as const },
    { organizationId: 1, clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", templateName: "Quarterly Audit & Compliance Review", items: JSON.stringify([{ desc: "IT Compliance Audit", qty: 1, rate: 75000 }]), total: 88500, frequency: "quarterly" as const, nextRun: later(30), endDate: later(730), autoEmail: false, status: "paused" as const },
    { organizationId: 1, clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", templateName: "Security Compliance Retainer", items: JSON.stringify([{ desc: "Monthly Security Patches & Updates", qty: 1, rate: 55000 }, { desc: "Monthly Vulnerability Scan", qty: 1, rate: 25000 }]), total: 94400, frequency: "monthly" as const, nextRun: later(3), endDate: later(180), autoEmail: true, status: "active" as const },
  ];

  for (const ri of recurring) {
    await prisma.recurringInvoice.create({ data: ri });
    console.log(`  Recurring "${ri.templateName}" (${ri.frequency})`);
  }

  // ── ACCOUNTING: Chart of Accounts (18 standard accounts) ──────────
  const accounts = [
    { organizationId: 1, code: "1001", name: "Cash & Bank", type: "Asset" as const, subType: "Current Assets", balance: 2850000 },
    { organizationId: 1, code: "1002", name: "Accounts Receivable", type: "Asset" as const, subType: "Current Assets", balance: 1890000 },
    { organizationId: 1, code: "1003", name: "Inventory", type: "Asset" as const, subType: "Current Assets", balance: 950000 },
    { organizationId: 1, code: "1101", name: "Office Equipment", type: "Asset" as const, subType: "Fixed Assets", balance: 450000 },
    { organizationId: 1, code: "1102", name: "Computer Hardware", type: "Asset" as const, subType: "Fixed Assets", balance: 680000 },
    { organizationId: 1, code: "2001", name: "Accounts Payable", type: "Liability" as const, subType: "Current Liabilities", balance: 720000 },
    { organizationId: 1, code: "2002", name: "Short Term Loans", type: "Liability" as const, subType: "Current Liabilities", balance: 350000 },
    { organizationId: 1, code: "2101", name: "Bank Loan — Term", type: "Liability" as const, subType: "Long Term Debt", balance: 1200000 },
    { organizationId: 1, code: "3001", name: "Share Capital", type: "Equity" as const, subType: "Capital", balance: 2500000 },
    { organizationId: 1, code: "3002", name: "Retained Earnings", type: "Equity" as const, subType: "Reserves", balance: 1750000 },
    { organizationId: 1, code: "4001", name: "Software License Revenue", type: "Revenue" as const, subType: "Operating Revenue", balance: 4200000 },
    { organizationId: 1, code: "4002", name: "Consulting Services", type: "Revenue" as const, subType: "Operating Revenue", balance: 1850000 },
    { organizationId: 1, code: "4003", name: "Maintenance & Support", type: "Revenue" as const, subType: "Recurring Revenue", balance: 960000 },
    { organizationId: 1, code: "5001", name: "Salaries & Wages", type: "Expense" as const, subType: "Operating Expenses", balance: 1200000 },
    { organizationId: 1, code: "5002", name: "Office Rent", type: "Expense" as const, subType: "Operating Expenses", balance: 360000 },
    { organizationId: 1, code: "5003", name: "Cloud Infrastructure", type: "Expense" as const, subType: "Operating Expenses", balance: 420000 },
    { organizationId: 1, code: "5004", name: "Marketing & Advertising", type: "Expense" as const, subType: "Operating Expenses", balance: 180000 },
    { organizationId: 1, code: "5005", name: "Travel & Conveyance", type: "Expense" as const, subType: "Operating Expenses", balance: 95000 },
  ];

  const createdAccounts: { id: number; code: string }[] = [];
  for (const acc of accounts) {
    const created = await prisma.account.create({ data: acc });
    createdAccounts.push({ id: created.id, code: created.code });
    console.log(`  Account ${acc.code} — ${acc.name}`);
  }

  // ── ACCOUNTING: Expenses (12) ─────────────────────────────────────
  const expenseEntries = [
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5002")!.id, amount: 30000, category: "Office Rent", description: "July office rent — Prestige Tech Park", date: ago(25), paymentMethod: "Bank_Transfer", reference: "RENT-JUL-001", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5003")!.id, amount: 42000, category: "Infrastructure", description: "AWS hosting — production cluster", date: ago(20), paymentMethod: "Credit_Card", reference: "AWS-PROD-0726", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5004")!.id, amount: 15000, category: "Marketing", description: "LinkedIn sponsored ads campaign", date: ago(18), paymentMethod: "UPI", reference: "MKT-LINKED-01", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5005")!.id, amount: 8500, category: "Travel", description: "Client visit — Mumbai office", date: ago(15), paymentMethod: "UPI", reference: "TRVL-MUM-01", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5001")!.id, amount: 150000, category: "Payroll", description: "July salary disbursement", date: ago(12), paymentMethod: "Bank_Transfer", reference: "PAY-JUL-26", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5003")!.id, amount: 18000, category: "Infrastructure", description: "Database backup storage expansion", date: ago(10), paymentMethod: "Credit_Card", reference: "AWS-DB-0726", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5002")!.id, amount: 30000, category: "Office Rent", description: "August office rent", date: ago(5), paymentMethod: "Bank_Transfer", reference: "RENT-AUG-001", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5004")!.id, amount: 8000, category: "Marketing", description: "Google Ads campaign", date: ago(4), paymentMethod: "UPI", reference: "MKT-GOOGLE-01", status: "pending" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5005")!.id, amount: 12000, category: "Travel", description: "Team offsite — Coorg", date: ago(3), paymentMethod: "Credit_Card", reference: "TRVL-OFFSITE", status: "pending" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5003")!.id, amount: 22000, category: "Infrastructure", description: "CDN subscription renewal", date: ago(2), paymentMethod: "Credit_Card", reference: "CDN-RENEW-01", status: "pending" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5001")!.id, amount: 50000, category: "Payroll", description: "Consultant fees — UI/UX designer", date: ago(1), paymentMethod: "Bank_Transfer", reference: "CONS-JUL-01", status: "paid" },
    { organizationId: 1, accountId: createdAccounts.find(a => a.code === "5004")!.id, amount: 25000, category: "Marketing", description: "Annual trade show booth booking", date: ago(0), paymentMethod: "Cheque", reference: "EVENT-Q3-01", status: "pending" },
  ];

  for (const exp of expenseEntries) {
    await prisma.expense.create({ data: exp });
    console.log(`  Expense ${exp.reference} — ₹${exp.amount.toLocaleString()}`);
  }

  // ── ACCOUNTING: Ledger Entries ────────────────────────────────────
  for (const inv of createdInvoices) {
    await prisma.ledgerEntry.create({
      data: {
        organizationId: 1,
        accountId: createdAccounts.find(a => a.code === "4001")!.id,
        entryDate: new Date(),
        description: `Invoice ${inv.invNum} — ${inv.status}`,
        debit: inv.status === "void" ? 0 : inv.total,
        credit: 0,
        referenceType: "Invoice",
        referenceId: inv.id,
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        organizationId: 1,
        accountId: createdAccounts.find(a => a.code === "1002")!.id,
        entryDate: new Date(),
        description: `Receivable — ${inv.invNum}`,
        debit: 0,
        credit: inv.status === "void" ? 0 : inv.total,
        referenceType: "Invoice",
        referenceId: inv.id,
      },
    });
  }

  // ── ACCOUNTING: Cash-touching Ledger Entries (for Cash Flow) ────────
  const cashAccountId = createdAccounts.find(a => a.code === "1001")!.id;
  const arAccountId = createdAccounts.find(a => a.code === "1002")!.id;
  const apAccountId = createdAccounts.find(a => a.code === "2001")!.id;

  const cashEntries = [
    // Cash received from customers (mirroring payments)
    { accountId: cashAccountId, entryDate: ago(50), description: "NEFT — Meridian Foods payment INV-202608-0001", debit: 162000, credit: 0, refType: "Payment", refId: 1 },
    { accountId: arAccountId, entryDate: ago(50), description: "Reversal of AR — Meridian Foods INV-202608-0001", debit: 0, credit: 162000, refType: "Payment", refId: 1 },
    { accountId: cashAccountId, entryDate: ago(55), description: "UPI — Halcyon Media payment INV-202608-0003", debit: 50000, credit: 0, refType: "Payment", refId: 2 },
    { accountId: arAccountId, entryDate: ago(55), description: "Reversal of AR — Halcyon Media INV-202608-0003", debit: 0, credit: 50000, refType: "Payment", refId: 2 },
    { accountId: cashAccountId, entryDate: ago(5), description: "NEFT — Bristow Textiles payment INV-202608-0005", debit: 150000, credit: 0, refType: "Payment", refId: 4 },
    { accountId: arAccountId, entryDate: ago(5), description: "Reversal of AR — Bristow Textiles INV-202608-0005", debit: 0, credit: 150000, refType: "Payment", refId: 4 },
    { accountId: cashAccountId, entryDate: ago(20), description: "UPI — Apex Logistics payment INV-202608-0017", debit: 100300, credit: 0, refType: "Payment", refId: 5 },
    { accountId: arAccountId, entryDate: ago(20), description: "Reversal of AR — Apex Logistics INV-202608-0017", debit: 0, credit: 100300, refType: "Payment", refId: 5 },
    { accountId: cashAccountId, entryDate: ago(20), description: "NEFT — Titan Defence payment INV-202608-0018", debit: 200000, credit: 0, refType: "Payment", refId: 6 },
    { accountId: arAccountId, entryDate: ago(20), description: "Reversal of AR — Titan Defence INV-202608-0018", debit: 0, credit: 200000, refType: "Payment", refId: 6 },
    { accountId: cashAccountId, entryDate: ago(10), description: "NEFT — Solara Renewable payment INV-202608-0020", debit: 100000, credit: 0, refType: "Payment", refId: 7 },
    { accountId: arAccountId, entryDate: ago(10), description: "Reversal of AR — Solara Renewable INV-202608-0020", debit: 0, credit: 100000, refType: "Payment", refId: 7 },
    // Cash paid for expenses
    { accountId: cashAccountId, entryDate: ago(25), description: "Bank Transfer — Office Rent July", debit: 0, credit: 30000, refType: "Expense", refId: 1 },
    { accountId: cashAccountId, entryDate: ago(20), description: "Credit Card — AWS hosting", debit: 0, credit: 42000, refType: "Expense", refId: 2 },
    { accountId: cashAccountId, entryDate: ago(18), description: "UPI — LinkedIn ads", debit: 0, credit: 15000, refType: "Expense", refId: 3 },
    { accountId: cashAccountId, entryDate: ago(15), description: "UPI — Client visit Mumbai", debit: 0, credit: 8500, refType: "Expense", refId: 4 },
    { accountId: cashAccountId, entryDate: ago(12), description: "Bank Transfer — July salary", debit: 0, credit: 150000, refType: "Expense", refId: 5 },
    { accountId: cashAccountId, entryDate: ago(5), description: "Bank Transfer — August office rent", debit: 0, credit: 30000, refType: "Expense", refId: 7 },
    // Vendor bill payments
    { accountId: cashAccountId, entryDate: ago(10), description: "NEFT — Schneider Electric India payment INV-202608-0022", debit: 0, credit: 100000, refType: "Payment", refId: 9 },
    { accountId: apAccountId, entryDate: ago(10), description: "Reversal of AP — Schneider Electric India INV-202608-0022", debit: 100000, credit: 0, refType: "Payment", refId: 9 },
  ];

  for (const ce of cashEntries) {
    await prisma.ledgerEntry.create({
      data: {
        organizationId: 1,
        accountId: ce.accountId,
        entryDate: ce.entryDate,
        description: ce.description,
        debit: new Prisma.Decimal(ce.debit),
        credit: new Prisma.Decimal(ce.credit),
        referenceType: ce.refType,
        referenceId: ce.refId,
      },
    });
  }
  console.log(`  Cash ledger entries: ${cashEntries.length / 2} payment transactions + expense entries`);

  // ── ACCOUNTING: Fiscal Periods ──────────────────────────────────────
  const fiscalPeriods = [
    { organizationId: 1, label: "FY 2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isClosed: false },
    { organizationId: 1, label: "April 2026", startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30"), isClosed: false },
    { organizationId: 1, label: "May 2026", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), isClosed: false },
    { organizationId: 1, label: "June 2026", startDate: new Date("2026-06-01"), endDate: new Date("2026-06-30"), isClosed: false },
    { organizationId: 1, label: "July 2026", startDate: new Date("2026-07-01"), endDate: new Date("2026-07-31"), isClosed: false },
  ];
  for (const fp of fiscalPeriods) {
    await prisma.fiscalPeriod.create({ data: fp });
    console.log(`  Fiscal period ${fp.label}`);
  }

  // ── ACCOUNTING: Close a Fiscal Period ────────────────────────────────
  const closedPeriod = await prisma.fiscalPeriod.create({
    data: {
      organizationId: 1,
      label: "March 2026",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-31"),
      isClosed: true,
      closedAt: new Date("2026-04-05"),
      closedBy: 1,
    },
  });
  console.log(`  Fiscal period ${closedPeriod.label} (closed)`);

  await prisma.closeSignOff.create({
    data: {
      organizationId: 1,
      periodId: closedPeriod.id,
      role: "Controller",
      userId: 1,
      signedAt: new Date("2026-04-03"),
      comments: "All transactions verified and reconciled for March 2026.",
    },
  });
  console.log("  Close sign-off (Controller)");

  await prisma.closeSignOff.create({
    data: {
      organizationId: 1,
      periodId: closedPeriod.id,
      role: "CFO",
      userId: 1,
      signedAt: new Date("2026-04-05"),
      comments: "Approved. Period closed.",
    },
  });
  console.log("  Close sign-off (CFO)");

  await prisma.closeAuditLog.create({
    data: {
      organizationId: 1,
      periodId: closedPeriod.id,
      action: "CLOSE",
      performedBy: 1,
      details: "Period closed by Organization Owner (Alex Chen). Controller and CFO sign-offs completed.",
    },
  });
  console.log("  Close audit log entry");

  // ── BANK RECONCILIATION: Tolerance Rule ────────────────────────────
  await prisma.reconciliationToleranceRule.create({
    data: {
      organizationId: 1,
      amountTolerance: new Prisma.Decimal(5.00),
      dateToleranceDays: 3,
      matchByReference: true,
      matchByPaymentMethod: true,
      matchByLedger: true,
    },
  });
  console.log("  Reconciliation tolerance rule (defaults)");

  // ── BANK RECONCILIATION: Transactions ──────────────────────────────
  const inv3 = createdInvoices[2];  // INV-202608-0003, overdue, Halcyon Media
  const inv5 = createdInvoices[4];  // INV-202608-0005, partially_paid, Bristow Textiles
  const inv1 = createdInvoices[0];  // INV-202608-0001, paid, Meridian Foods
  const inv17 = createdInvoices[16]; // INV-202608-0017, paid, Apex Logistics
  const inv19 = createdInvoices[18]; // INV-202608-0019, overdue, Orbit Health

  // Look up payment IDs by reference
  const payMf = await prisma.payment.findFirst({ where: { referenceId: "NEFT-MF-001" } });
  const payBt = await prisma.payment.findFirst({ where: { referenceId: "NEFT-BT-001" } });
  const payAl = await prisma.payment.findFirst({ where: { referenceId: "UPI-AL-001" } });
  const payHm = await prisma.payment.findFirst({ where: { referenceId: "UPI-HM-001" } });

  const bankTxnData = [
    { orgId: 1, date: new Date("2026-05-20"), desc: "NEFT — Meridian Foods INV-202608-0001", ref: "NEFT-MF-001", debit: 0, credit: 162000, balance: 162000, matchPayId: payMf?.id ?? null, matchInvId: inv1.id, classification: "Matched", importBatch: "BATCH-2026-05" },
    { orgId: 1, date: new Date("2026-05-15"), desc: "UPI — Halcyon Media INV-202608-0003", ref: "UPI-HM-001", debit: 0, credit: 50000, balance: 212000, matchPayId: payHm?.id ?? null, matchInvId: inv3.id, classification: "Matched", importBatch: "BATCH-2026-05" },
    { orgId: 1, date: new Date("2026-05-22"), desc: "NEFT — Bristow Textiles INV-202608-0005", ref: "NEFT-BT-001", debit: 0, credit: 150000, balance: 362000, matchPayId: payBt?.id ?? null, matchInvId: inv5.id, classification: "Matched", importBatch: "BATCH-2026-05" },
    { orgId: 1, date: new Date("2026-05-25"), desc: "UPI — Apex Logistics INV-202608-0017", ref: "UPI-AL-001", debit: 0, credit: 100300, balance: 462300, matchPayId: payAl?.id ?? null, matchInvId: inv17.id, classification: "Matched", importBatch: "BATCH-2026-05" },
    { orgId: 1, date: new Date("2026-05-28"), desc: "Bank Charges — May 2026", ref: "CHG-0526", debit: 250, credit: 0, balance: 462050, matchPayId: null, matchInvId: null, classification: "Exception", importBatch: "BATCH-2026-05" },
    { orgId: 1, date: new Date("2026-06-01"), desc: "Unidentified Deposit — Ref: UPI-CONSULT-001", ref: "UPI-CONSULT-001", debit: 0, credit: 32000, balance: 494050, matchPayId: null, matchInvId: null, classification: "Unmatched", importBatch: "BATCH-2026-06" },
    { orgId: 1, date: new Date("2026-06-02"), desc: "Cheque Deposit — Orbit Health", ref: "CHQ-ORBIT-001", debit: 0, credit: 88000, balance: 582050, matchPayId: null, matchInvId: inv19.id, classification: "Partial_Match", importBatch: "BATCH-2026-06" },
    { orgId: 1, date: new Date("2026-06-03"), desc: "NEFT — Retainer Meridian Foods Q3", ref: "NEFT-RETAINER-001", debit: 0, credit: 75000, balance: 657050, matchPayId: null, matchInvId: null, classification: "Unmatched", importBatch: "BATCH-2026-06" },
    { orgId: 1, date: new Date("2026-06-05"), desc: "UPI Refund — Duplicate Payment MF", ref: "CC-MF-001", debit: 177000, credit: 0, balance: 480050, matchPayId: null, matchInvId: inv1.id, classification: "Duplicate", importBatch: "BATCH-2026-06" },
    { orgId: 1, date: new Date("2026-06-07"), desc: "NEFT — Titan Defence INV-202608-0018", ref: "NEFT-TD-001", debit: 0, credit: 200000, balance: 680050, matchPayId: null, matchInvId: createdInvoices[17].id, classification: "Matched", importBatch: "BATCH-2026-06" },
  ];

  for (const t of bankTxnData) {
    await prisma.bankTransaction.create({
      data: {
        organizationId: t.orgId,
        transactionDate: t.date,
        description: t.desc,
        reference: t.ref,
        debit: new Prisma.Decimal(t.debit),
        credit: new Prisma.Decimal(t.credit),
        balance: new Prisma.Decimal(t.balance),
        matchedPaymentId: t.matchPayId,
        matchedInvoiceId: t.matchInvId,
        classification: t.classification,
        importBatch: t.importBatch,
      },
    });
    console.log(`  Bank transaction ${t.ref} (${t.classification})`);
  }

  // ── BANK RECONCILIATION: Audit Logs ────────────────────────────────
  const allBankTxns = await prisma.bankTransaction.findMany({ where: { organizationId: 1 } });
  const auditActions = [
    { actionType: "AUTO_MATCH", txnIdx: 0, payRef: "NEFT-MF-001", notes: "Auto-matched to payment NEFT-MF-001 (INV-202608-0001)" },
    { actionType: "AUTO_MATCH", txnIdx: 1, payRef: "UPI-HM-001", notes: "Auto-matched to payment UPI-HM-001 (INV-202608-0003)" },
    { actionType: "AUTO_MATCH", txnIdx: 2, payRef: "NEFT-BT-001", notes: "Auto-matched to payment NEFT-BT-001 (INV-202608-0005)" },
    { actionType: "MANUAL_RECONCILE", txnIdx: 3, payRef: "UPI-AL-001", notes: "Manually reconciled to payment UPI-AL-001 (INV-202608-0017)" },
    { actionType: "MANUAL_ADJUSTMENT", txnIdx: 4, payRef: "CHG-0526", notes: "Bank charges — no matching invoice, classified as Exception", adjustedAmount: 250 },
    { actionType: "AUTO_MATCH", txnIdx: 9, payRef: "NEFT-TD-001", notes: "Auto-matched to payment NEFT-TD-001 (INV-202608-0018)" },
  ];

  for (const a of auditActions) {
    const txn = allBankTxns[a.txnIdx];
    if (!txn) continue;
    await prisma.reconciliationAuditLog.create({
      data: {
        organizationId: 1,
        actionType: a.actionType,
        bankTransactionId: txn.id,
        matchedPaymentId: txn.matchedPaymentId,
        matchedInvoiceId: txn.matchedInvoiceId,
        adjustedAmount: a.adjustedAmount ? new Prisma.Decimal(a.adjustedAmount) : null,
        notes: a.notes,
        performedBy: "System",
      },
    });
    console.log(`  Audit log: ${a.actionType} — ${a.payRef}`);
  }

  // ── DUNNING: Records for overdue invoices ──────────────────────────
  const overdueInvoices = [
    { inv: createdInvoices[2], daysOverdue: 60, level: 3, notes: "Third reminder — INV-202608-0003 (Halcyon Media). Outstanding: ₹42,000. Legal notice sent." },
    { inv: createdInvoices[18], daysOverdue: 45, level: 2, notes: "Second reminder — INV-202608-0019 (Orbit Health). Outstanding: ₹1,59,360. Late fee applicable." },
  ];

  for (const di of overdueInvoices) {
    await prisma.dunningRecord.create({
      data: {
        organizationId: 1,
        invoiceId: di.inv.id,
        level: di.level,
        daysOverdue: di.daysOverdue,
        notifiedAt: new Date(),
        notes: di.notes,
      },
    });
    console.log(`  Dunning record — ${di.inv.invNum} (level ${di.level})`);
  }

  // ── ACCOUNTING: Account Mappings ────────────────────────────────────
  const accountMappings = [
    { organizationId: 1, role: "ROLE_ACCOUNTS_RECEIVABLE", accountId: createdAccounts.find(a => a.code === "1002")!.id },
    { organizationId: 1, role: "ROLE_SALES_REVENUE", accountId: createdAccounts.find(a => a.code === "4001")!.id },
    { organizationId: 1, role: "ROLE_CASH", accountId: createdAccounts.find(a => a.code === "1001")!.id },
    { organizationId: 1, role: "ROLE_BANK", accountId: createdAccounts.find(a => a.code === "1001")!.id },
    { organizationId: 1, role: "ROLE_ACCOUNTS_PAYABLE", accountId: createdAccounts.find(a => a.code === "2001")!.id },
    { organizationId: 1, role: "ROLE_EXPENSE", accountId: createdAccounts.find(a => a.code === "5001")!.id },
    { organizationId: 1, role: "ROLE_TAX_PAYABLE", accountId: createdAccounts.find(a => a.code === "2001")!.id },
  ];
  for (const am of accountMappings) {
    await prisma.accountMapping.create({ data: am });
    console.log(`  Mapping ${am.role}`);
  }

  // ── ACCOUNTING: Recompute balances from ledger entries ──────────────
  console.log("\n  Computing account balances from ledger entries...");
  const ledgerAgg = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    where: { organizationId: 1 },
    _sum: { debit: true, credit: true },
  });
  for (const agg of ledgerAgg) {
    const netBalance = Number(agg._sum.debit) - Number(agg._sum.credit);
    await prisma.account.update({
      where: { id: agg.accountId },
      data: { balance: netBalance },
    });
    const acc = createdAccounts.find(a => a.id === agg.accountId);
    if (acc) {
      console.log(`  Account ${acc.code} → ₹${netBalance.toLocaleString()}`);
    }
  }

  console.log("\nBilling seeding completed successfully!");
  console.log(`Summary: ${invoices.length} invoices, ${payments.length} payments, ${quotations.length} quotes, ${creditNotes.length} credit notes, ${debitNotes.length} debit notes, ${recurring.length} recurring, ${accounts.length} accounts, ${expenseEntries.length} expenses, ${fiscalPeriods.length + 1} periods, ${accountMappings.length} mappings, 1 closed period, 10 bank transactions, 6 audit logs, 2 dunning records`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
