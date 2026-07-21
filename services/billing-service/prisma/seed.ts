// Comprehensive billing seed — 22 invoices (incl. 3 vendor bills), 18+ payments, 10 quotes, 5 recurring.
declare const process: any;
import { PrismaClient } from "@prisma/client";

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
  "Tata Steel Limited": 1, "UltraTech Cement Ltd": 2,
  "Philips India Ltd": 3, "Asian Paints Limited": 4,
  "Finolex Pipes Ltd": 5, "Legrand India Pvt Ltd": 6,
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
  await prisma.account.deleteMany().catch(() => {});

  console.log("Seeding billing database with 22 invoices (19 receivable + 3 vendor bills)...");

  // ── INVOICES (22) ─────────────────────────────────────────────────
  const invoices: InvDef[] = [
    // ── RECEIVABLE INVOICES (19) ──
    // 1 - Meridian Foods (paid)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-001",
      status: "paid", issueDate: ago(60), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 150000, discount: 0, cgst: 13500, sgst: 13500, igst: 0, taxTotal: 27000, total: 177000, paidAmount: 177000, balanceDue: 0,
      items: [
        { productId: null, description: "Industrial Automation Controller X200 (5 units)", quantity: 5, unitPrice: 25000, gstRate: 18, amount: 125000 },
        { productId: null, description: "Sensor Array Kit — Proximity (10 units)", quantity: 10, unitPrice: 2500, gstRate: 18, amount: 25000 },
      ]},
    // 2 - Cirrus Aviation (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", invoiceNumber: "INV-2026-002",
      status: "sent", issueDate: ago(30), dueDate: later(0),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 420000, discount: 0, cgst: 0, sgst: 0, igst: 75600, taxTotal: 75600, total: 495600, paidAmount: 0, balanceDue: 495600,
      items: [
        { productId: null, description: "Aviation-Grade Telemetry Module (3 units)", quantity: 3, unitPrice: 120000, gstRate: 18, amount: 360000 },
        { productId: null, description: "Flight Data Recorder Interface (2 units)", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 },
      ]},
    // 3 - Halcyon Media (overdue)
    { organizationId: 1, type: "receivable", clientId: cid("Halcyon Media"), clientName: "Halcyon Media", invoiceNumber: "INV-2026-003",
      status: "overdue", issueDate: ago(90), dueDate: ago(60),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 85000, discount: 0, cgst: 7650, sgst: 7650, igst: 0, taxTotal: 15300, total: 100300, paidAmount: 50000, balanceDue: 50300,
      items: [
        { productId: null, description: "Content Delivery Network Setup (1 year)", quantity: 1, unitPrice: 55000, gstRate: 18, amount: 55000 },
        { productId: null, description: "Media Asset Management License (annual)", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 },
      ]},
    // 4 - Orbit Health (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-2026-004",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 230000, discount: 25000, discountType: "fixed", cgst: 18450, sgst: 18450, igst: 0, taxTotal: 36900, total: 241900, paidAmount: 0, balanceDue: 241900,
      items: [
        { productId: null, description: "Healthcare Data Platform — Base License", quantity: 1, unitPrice: 180000, gstRate: 18, amount: 180000 },
        { productId: null, description: "Patient Portal Integration Services", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
      ]},
    // 5 - Bristow Textiles (partially_paid)
    { organizationId: 1, type: "receivable", clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", invoiceNumber: "INV-2026-005",
      status: "partially_paid", issueDate: ago(15), dueDate: later(15),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 310000, discount: 0, cgst: 0, sgst: 0, igst: 55800, taxTotal: 55800, total: 365800, paidAmount: 150000, balanceDue: 215800,
      items: [
        { productId: null, description: "ERP Manufacturing Module — Textile Edition", quantity: 1, unitPrice: 250000, gstRate: 18, amount: 250000 },
        { productId: null, description: "Implementation & Training (40 hours)", quantity: 40, unitPrice: 1500, gstRate: 18, amount: 60000 },
      ]},
    // 6 - Meridian Foods (void — was cancelled)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-006",
      status: "void", issueDate: ago(120), dueDate: ago(105),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 75000, discount: 0, cgst: 6750, sgst: 6750, igst: 0, taxTotal: 13500, total: 88500, paidAmount: 0, balanceDue: 0,
      items: [
        { productId: null, description: "Warehouse Automation Feasibility Study", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
      ]},
    // 7 - Nimbus Technologies (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", invoiceNumber: "INV-2026-007",
      status: "sent", issueDate: ago(10), dueDate: later(20),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 346000, discount: 0, cgst: 31140, sgst: 31140, igst: 0, taxTotal: 62280, total: 408280, paidAmount: 0, balanceDue: 408280,
      items: [
        { productId: null, description: "Cloud Migration Suite — Enterprise Edition", quantity: 1, unitPrice: 280000, gstRate: 18, amount: 280000 },
        { productId: null, description: "Data Migration Services (80 hours)", quantity: 80, unitPrice: 825, gstRate: 18, amount: 66000 },
      ]},
    // 8 - Solara Renewable (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-2026-008",
      status: "sent", issueDate: ago(3), dueDate: later(27),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 525800, discount: 0, cgst: 47322, sgst: 47322, igst: 0, taxTotal: 94644, total: 620444, paidAmount: 0, balanceDue: 620444,
      items: [
        { productId: null, description: "SCADA System — Solar Plant Edition", quantity: 1, unitPrice: 420000, gstRate: 18, amount: 420000 },
        { productId: null, description: "IoT Sensor Gateway (15 units)", quantity: 15, unitPrice: 3200, gstRate: 18, amount: 48000 },
        { productId: null, description: "On-site Commissioning (40 hours)", quantity: 40, unitPrice: 1445, gstRate: 18, amount: 57800 },
      ]},
    // 9 - Titan Defence (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-2026-009",
      status: "sent", issueDate: ago(20), dueDate: later(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 697500, discount: 0, cgst: 0, sgst: 0, igst: 125550, taxTotal: 125550, total: 823050, paidAmount: 0, balanceDue: 823050,
      items: [
        { productId: null, description: "Secure Communications Suite — Classified", quantity: 1, unitPrice: 550000, gstRate: 18, amount: 550000 },
        { productId: null, description: "FIPS 140-3 Compliance Module", quantity: 1, unitPrice: 87500, gstRate: 18, amount: 87500 },
        { productId: null, description: "Security Audit & Penetration Testing", quantity: 1, unitPrice: 60000, gstRate: 18, amount: 60000 },
      ]},
    // 10 - Pinnacle Realty (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", invoiceNumber: "INV-2026-010",
      status: "sent", issueDate: ago(7), dueDate: later(23),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 165400, discount: 10000, discountType: "fixed", cgst: 13986, sgst: 13986, igst: 0, taxTotal: 27972, total: 183372, paidAmount: 0, balanceDue: 183372,
      items: [
        { productId: null, description: "PropTech Platform — Annual License", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Property Listing Import & Migration", quantity: 1, unitPrice: 25000, gstRate: 18, amount: 25000 },
        { productId: null, description: "CRM Data Migration Services", quantity: 20, unitPrice: 1020, gstRate: 18, amount: 20400 },
      ]},
    // 11 - Delta Automotive (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Delta Automotive"), clientName: "Delta Automotive", invoiceNumber: "INV-2026-011",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 265000, discount: 0, cgst: 0, sgst: 0, igst: 47700, taxTotal: 47700, total: 312700, paidAmount: 0, balanceDue: 312700,
      items: [
        { productId: null, description: "MES Platform — Automotive Edition", quantity: 1, unitPrice: 220000, gstRate: 18, amount: 220000 },
        { productId: null, description: "SAP Integration Adapter", quantity: 1, unitPrice: 45000, gstRate: 18, amount: 45000 },
      ]},
    // 12 - Oceanic Pharmaceuticals (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", invoiceNumber: "INV-2026-012",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 753800, discount: 0, cgst: 67842, sgst: 67842, igst: 0, taxTotal: 135684, total: 889484, paidAmount: 0, balanceDue: 889484,
      items: [
        { productId: null, description: "GxP Compliance Suite — Full License", quantity: 1, unitPrice: 580000, gstRate: 18, amount: 580000 },
        { productId: null, description: "GxP Validation Services Package", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Electronic Signature Module", quantity: 1, unitPrice: 53800, gstRate: 18, amount: 53800 },
      ]},
    // 13 - Everest Logistics (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Everest Logistics"), clientName: "Everest Logistics", invoiceNumber: "INV-2026-013",
      status: "sent", issueDate: ago(12), dueDate: later(18),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 207600, discount: 0, cgst: 0, sgst: 0, igst: 37368, taxTotal: 37368, total: 244968, paidAmount: 0, balanceDue: 244968,
      items: [
        { productId: null, description: "WMS Platform — Logistics Edition", quantity: 1, unitPrice: 160000, gstRate: 18, amount: 160000 },
        { productId: null, description: "EDI Integration Setup", quantity: 1, unitPrice: 35000, gstRate: 18, amount: 35000 },
        { productId: null, description: "Mobile App — Warehouse Scanner", quantity: 1, unitPrice: 12600, gstRate: 18, amount: 12600 },
      ]},
    // 14 - Velora Hospitality (draft)
    { organizationId: 1, type: "receivable", clientId: cid("Velora Hospitality"), clientName: "Velora Hospitality", invoiceNumber: "INV-2026-014",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 114000, discount: 0, cgst: 10260, sgst: 10260, igst: 0, taxTotal: 20520, total: 134520, paidAmount: 0, balanceDue: 134520,
      items: [
        { productId: null, description: "Hotel PMS Software — Base License", quantity: 1, unitPrice: 85000, gstRate: 18, amount: 85000 },
        { productId: null, description: "Channel Manager Integration", quantity: 1, unitPrice: 29000, gstRate: 18, amount: 29000 },
      ]},
    // 15 - Meridian Foods (sent — additional)
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-015",
      status: "sent", issueDate: ago(4), dueDate: later(26),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 106000, discount: 0, cgst: 9540, sgst: 9540, igst: 0, taxTotal: 19080, total: 125080, paidAmount: 0, balanceDue: 125080,
      items: [
        { productId: null, description: "Advanced Analytics Add-on Module", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
        { productId: null, description: "Dashboards & Reports (10 custom)", quantity: 10, unitPrice: 3100, gstRate: 18, amount: 31000 },
      ]},
    // 16 - Starlight Entertainment (sent)
    { organizationId: 1, type: "receivable", clientId: cid("Starlight Entertainment"), clientName: "Starlight Entertainment", invoiceNumber: "INV-2026-016",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 66100, discount: 0, cgst: 5949, sgst: 5949, igst: 0, taxTotal: 11898, total: 77998, paidAmount: 0, balanceDue: 77998,
      items: [
        { productId: null, description: "Digital Asset Management Platform", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
        { productId: null, description: "Media Encoding Pipeline Setup", quantity: 1, unitPrice: 18100, gstRate: 18, amount: 18100 },
      ]},
    // 17 - Apex Logistics (paid)
    { organizationId: 1, type: "receivable", clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", invoiceNumber: "INV-2026-017",
      status: "paid", issueDate: ago(45), dueDate: ago(15),
      gstTreatment: "interstate", placeOfSupply: "Gujarat",
      subtotal: 85000, discount: 0, cgst: 0, sgst: 0, igst: 15300, taxTotal: 15300, total: 100300, paidAmount: 100300, balanceDue: 0,
      items: [
        { productId: null, description: "Transport Management System — Basic", quantity: 1, unitPrice: 70000, gstRate: 18, amount: 70000 },
        { productId: null, description: "GPS Tracking Integration", quantity: 1, unitPrice: 15000, gstRate: 18, amount: 15000 },
      ]},
    // 18 - Titan Defence (partially paid)
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-2026-018",
      status: "partially_paid", issueDate: ago(40), dueDate: ago(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 380000, discount: 0, cgst: 0, sgst: 0, igst: 68400, taxTotal: 68400, total: 448400, paidAmount: 200000, balanceDue: 248400,
      items: [
        { productId: null, description: "Secure Data Center — Rack Integration", quantity: 2, unitPrice: 150000, gstRate: 18, amount: 300000 },
        { productId: null, description: "Hardware Security Module (HSM)", quantity: 2, unitPrice: 40000, gstRate: 18, amount: 80000 },
      ]},
    // 19 - Orbit Health (overdue — repeat)
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-2026-019",
      status: "overdue", issueDate: ago(75), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 152000, discount: 0, cgst: 13680, sgst: 13680, igst: 0, taxTotal: 27360, total: 179360, paidAmount: 0, balanceDue: 179360,
      items: [
        { productId: null, description: "EHR Data Migration (Phase 1)", quantity: 1, unitPrice: 95000, gstRate: 18, amount: 95000 },
        { productId: null, description: "Legacy System Integration — HL7", quantity: 1, unitPrice: 57000, gstRate: 18, amount: 57000 },
      ]},
    // 20 - Solara Renewable (partially_paid)
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-2026-020",
      status: "partially_paid", issueDate: ago(25), dueDate: later(5),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 198000, discount: 5000, discountType: "percentage", cgst: 17370, sgst: 17370, igst: 0, taxTotal: 34740, total: 227740, paidAmount: 100000, balanceDue: 127740,
      items: [
        { productId: null, description: "Solar Farm Monitoring — 50MW License", quantity: 1, unitPrice: 150000, gstRate: 18, amount: 150000 },
        { productId: null, description: "Weather Station Integration", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
      ]},

    // ── VENDOR BILLS (3 — payable) ──
    // 21 - Tata Steel vendor bill (draft)
    { organizationId: 1, type: "payable",
      vendorId: vid("Tata Steel Limited"), vendorName: "Tata Steel Limited",
      invoiceNumber: "BILL-2026-001",
      status: "draft", issueDate: ago(5), dueDate: later(25),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 425000, discount: 0, cgst: 0, sgst: 0, igst: 76500, taxTotal: 76500, total: 501500, paidAmount: 0, balanceDue: 501500,
      items: [
        { productId: null, description: "Steel Rod 12mm TATA Tiscon (300 units)", quantity: 300, unitPrice: 1250, gstRate: 18, amount: 375000 },
        { productId: null, description: "TMT Steel Bar 16mm JSW (50 units)", quantity: 50, unitPrice: 1000, gstRate: 18, amount: 50000 },
      ]},
    // 22 - UltraTech Cement vendor bill (partially paid)
    { organizationId: 1, type: "payable",
      vendorId: vid("UltraTech Cement Ltd"), vendorName: "UltraTech Cement Ltd",
      invoiceNumber: "BILL-2026-002",
      status: "partially_paid", issueDate: ago(20), dueDate: later(10),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 180000, discount: 0, cgst: 8100, sgst: 8100, igst: 0, taxTotal: 16200, total: 196200, paidAmount: 100000, balanceDue: 96200,
      items: [
        { productId: null, description: "Cement 50kg Bag UltraTech (400 bags)", quantity: 400, unitPrice: 450, gstRate: 5, amount: 180000 },
      ]},
    // 23 - Asian Paints vendor bill (sent)
    { organizationId: 1, type: "payable",
      vendorId: vid("Asian Paints Limited"), vendorName: "Asian Paints Limited",
      invoiceNumber: "BILL-2026-003",
      status: "sent", issueDate: ago(8), dueDate: later(22),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 168000, discount: 8000, discountType: "fixed", cgst: 14400, sgst: 14400, igst: 0, taxTotal: 28800, total: 188800, paidAmount: 0, balanceDue: 188800,
      items: [
        { productId: null, description: "Paint Bucket 20L Asian Paints Royale (60 buckets)", quantity: 60, unitPrice: 2800, gstRate: 18, amount: 168000 },
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
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 177000, paymentMethod: "Bank_Transfer", paymentDate: ago(50), referenceId: "NEFT-MF-001", notes: "Full payment INV-2026-001", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50000, paymentMethod: "UPI", paymentDate: ago(55), referenceId: "UPI-HM-001", notes: "Partial payment INV-2026-003", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50300, paymentMethod: "Cheque", paymentDate: ago(5), referenceId: "CHQ-HM-002", notes: "Overdue payment INV-2026-003 — bounced", status: "failed" },
    { organizationId: 1, invoiceId: createdInvoices[4].id, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(5), referenceId: "NEFT-BT-001", notes: "Partial payment INV-2026-005", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[16].id, amount: 100300, paymentMethod: "UPI", paymentDate: ago(20), referenceId: "UPI-AL-001", notes: "Full payment INV-2026-017", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[17].id, amount: 200000, paymentMethod: "Bank_Transfer", paymentDate: ago(20), referenceId: "NEFT-TD-001", notes: "Partial payment INV-2026-018", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[19].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-SR-001", notes: "Partial payment INV-2026-020", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 177000, paymentMethod: "Credit_Card", paymentDate: ago(48), referenceId: "CC-MF-001", notes: "Duplicate payment — refunded", status: "refunded" },
    { organizationId: 1, invoiceId: createdInvoices[21].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-UC-001", notes: "Partial payment BILL-2026-002", status: "cleared" },
    // Standalone payments
    { organizationId: 1, invoiceId: null, amount: 25000, paymentMethod: "UPI", paymentDate: ago(3), referenceId: "UPI-ADV-001", notes: "Advance payment — new project", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 50000, paymentMethod: "Credit_Card", paymentDate: ago(7), referenceId: "CC-ADV-001", notes: "Subscription renewal — annual", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(2), referenceId: "NEFT-MISC-001", notes: "Invoice INV-2026-002 partial", status: "failed" },
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

  // ── QUOTATIONS (10) ──────────────────────────────────────────────
  const quotations = [
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", quoteNumber: "QTN-2026-001", total: 245000, status: "accepted" as const, issueDate: ago(45), validUntil: ago(15), notes: "Q3 Expansion Contract" },
    { organizationId: 1, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", quoteNumber: "QTN-2026-002", total: 510000, status: "sent" as const, issueDate: ago(10), validUntil: later(20), notes: "Fleet-wide telemetry upgrade" },
    { organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", quoteNumber: "QTN-2026-003", total: 625000, status: "draft" as const, issueDate: null, validUntil: null, notes: "EHR Platform — Phase 2" },
    { organizationId: 1, clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", quoteNumber: "QTN-2026-004", total: 350000, status: "sent" as const, issueDate: ago(8), validUntil: later(22), notes: "Cloud Migration Package" },
    { organizationId: 1, clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", quoteNumber: "QTN-2026-005", total: 480000, status: "draft" as const, issueDate: null, validUntil: null, notes: "Plant SCADA Overhaul" },
    { organizationId: 1, clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", quoteNumber: "QTN-2026-006", total: 220000, status: "sent" as const, issueDate: ago(5), validUntil: later(25), notes: "PropTech Platform" },
    { organizationId: 1, clientId: cid("Delta Automotive"), clientName: "Delta Automotive", quoteNumber: "QTN-2026-007", total: 395000, status: "draft" as const, issueDate: null, validUntil: null, notes: "MES Implementation" },
    { organizationId: 1, clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", quoteNumber: "QTN-2026-008", total: 780000, status: "sent" as const, issueDate: ago(2), validUntil: later(45), notes: "GxP Compliance Suite" },
    { organizationId: 1, clientId: cid("Everest Logistics"), clientName: "Everest Logistics", quoteNumber: "QTN-2026-009", total: 210000, status: "sent" as const, issueDate: ago(6), validUntil: later(24), notes: "WMS Upgrade" },
    { organizationId: 1, clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", quoteNumber: "QTN-2026-010", total: 98000, status: "rejected" as const, issueDate: ago(30), validUntil: ago(5), notes: "Budget constraints" },
  ];

  for (const q of quotations) {
    await prisma.quotation.create({ data: q });
    console.log(`  Quotation ${q.quoteNumber} (${q.status})`);
  }

  // ── CREDIT NOTES (5) ─────────────────────────────────────────────
  const creditNotes = [
    { organizationId: 1, invoiceId: createdInvoices[0].id, creditNoteNumber: "CN-2026-001", amount: 15000, reason: "Damaged goods returned — Controller X200 unit replaced", status: "issued" as const, issueDate: ago(40) },
    { organizationId: 1, invoiceId: createdInvoices[2].id, creditNoteNumber: "CN-2026-002", amount: 8300, reason: "Early payment discount (2% on overdue partial)", status: "issued" as const, issueDate: ago(50) },
    { organizationId: 1, invoiceId: createdInvoices[4].id, creditNoteNumber: "CN-2026-003", amount: 12500, reason: "Service credit — delayed implementation milestone", status: "issued" as const, issueDate: ago(8) },
    { organizationId: 1, invoiceId: createdInvoices[7].id, creditNoteNumber: "CN-2026-004", amount: 8500, reason: "Shipping damage — IoT sensor gateway (2 units)", status: "draft" as const, issueDate: ago(1) },
    { organizationId: 1, invoiceId: createdInvoices[18].id, creditNoteNumber: "CN-2026-005", amount: 20000, reason: "Scope reduction — removed HL7 interface module", status: "issued" as const, issueDate: ago(30) },
  ];

  for (const cn of creditNotes) {
    await prisma.creditNote.create({ data: cn });
    console.log(`  Credit note ${cn.creditNoteNumber}`);
  }

  // ── DEBIT NOTES (4) ─────────────────────────────────────────────
  const debitNotes = [
    { organizationId: 1, invoiceId: createdInvoices[1].id, debitNoteNumber: "DN-2026-001", amount: 12000, reason: "Price adjustment — additional integration modules", status: "issued" as const, issueDate: ago(20) },
    { organizationId: 1, invoiceId: createdInvoices[8].id, debitNoteNumber: "DN-2026-002", amount: 25000, reason: "Change order — extended pen-testing scope", status: "issued" as const, issueDate: ago(15) },
    { organizationId: 1, invoiceId: createdInvoices[6].id, debitNoteNumber: "DN-2026-003", amount: 15000, reason: "Additional data migration — extra 20 hrs", status: "draft" as const, issueDate: ago(2) },
    { organizationId: 1, invoiceId: createdInvoices[19].id, debitNoteNumber: "DN-2026-004", amount: 18000, reason: "Late payment interest (45 days overdue)", status: "issued" as const, issueDate: ago(10) },
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

  console.log("\nBilling seeding completed successfully!");
  console.log(`Summary: ${invoices.length} invoices, ${payments.length} payments, ${quotations.length} quotes, ${creditNotes.length} credit notes, ${debitNotes.length} debit notes, ${recurring.length} recurring, ${accounts.length} accounts, ${expenseEntries.length} expenses`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
