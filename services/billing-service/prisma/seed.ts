// Comprehensive billing seed — 20 invoices, 15+ payments, 10 quotes, 5 recurring.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const d = new Date();
const ago = (n: number) => new Date(d.getTime() - n * 86400000);
const later = (n: number) => new Date(d.getTime() + n * 86400000);

// Customer ID mapping (matches CRM seed creation order)
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

function cid(name: string): number { return CUSTOMER_IDS[name]; }

interface InvDef {
  organizationId: number; clientId: number; clientName: string;
  invoiceNumber: string; status: "draft"|"sent"|"paid"|"partially_paid"|"overdue"|"cancelled";
  issueDate: Date|null; dueDate: Date|null;
  gstTreatment: "intrastate"|"interstate"; placeOfSupply: string;
  subtotal: number; cgst: number; sgst: number; igst: number;
  taxTotal: number; total: number; paidAmount: number; balanceDue: number;
  items: { productId: number|null; description: string; quantity: number; unitPrice: number; gstRate: number; amount: number }[];
}

interface PayDef {
  organizationId: number; invoiceId: number|null; amount: number;
  paymentMethod: "Bank_Transfer"|"UPI"|"Credit_Card"|"Cheque"|"Cash";
  paymentDate: Date; referenceId: string; notes: string; status: "completed"|"failed"|"refunded";
}

async function main() {
  console.log("Seeding billing database with 20 invoices...");

  // ── INVOICES (20) ─────────────────────────────────────────────────
  const invoices: InvDef[] = [
    // 1 - Meridian Foods (paid)
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-001",
      status: "paid", issueDate: ago(60), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 150000, cgst: 13500, sgst: 13500, igst: 0, taxTotal: 27000, total: 177000, paidAmount: 177000, balanceDue: 0,
      items: [
        { productId: null, description: "Industrial Automation Controller X200 (5 units)", quantity: 5, unitPrice: 25000, gstRate: 18, amount: 125000 },
        { productId: null, description: "Sensor Array Kit — Proximity (10 units)", quantity: 10, unitPrice: 2500, gstRate: 18, amount: 25000 },
      ]},
    // 2 - Cirrus Aviation (sent)
    { organizationId: 1, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", invoiceNumber: "INV-2026-002",
      status: "sent", issueDate: ago(30), dueDate: later(0),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 420000, cgst: 0, sgst: 0, igst: 75600, taxTotal: 75600, total: 495600, paidAmount: 0, balanceDue: 495600,
      items: [
        { productId: null, description: "Aviation-Grade Telemetry Module (3 units)", quantity: 3, unitPrice: 120000, gstRate: 18, amount: 360000 },
        { productId: null, description: "Flight Data Recorder Interface (2 units)", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 },
      ]},
    // 3 - Halcyon Media (overdue)
    { organizationId: 1, clientId: cid("Halcyon Media"), clientName: "Halcyon Media", invoiceNumber: "INV-2026-003",
      status: "overdue", issueDate: ago(90), dueDate: ago(60),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 85000, cgst: 7650, sgst: 7650, igst: 0, taxTotal: 15300, total: 100300, paidAmount: 50000, balanceDue: 50300,
      items: [
        { productId: null, description: "Content Delivery Network Setup (1 year)", quantity: 1, unitPrice: 55000, gstRate: 18, amount: 55000 },
        { productId: null, description: "Media Asset Management License (annual)", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 },
      ]},
    // 4 - Orbit Health (draft)
    { organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-2026-004",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 230000, cgst: 20700, sgst: 20700, igst: 0, taxTotal: 41400, total: 271400, paidAmount: 0, balanceDue: 271400,
      items: [
        { productId: null, description: "Healthcare Data Platform — Base License", quantity: 1, unitPrice: 180000, gstRate: 18, amount: 180000 },
        { productId: null, description: "Patient Portal Integration Services", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
      ]},
    // 5 - Bristow Textiles (partially_paid)
    { organizationId: 1, clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", invoiceNumber: "INV-2026-005",
      status: "partially_paid", issueDate: ago(15), dueDate: later(15),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 310000, cgst: 0, sgst: 0, igst: 55800, taxTotal: 55800, total: 365800, paidAmount: 150000, balanceDue: 215800,
      items: [
        { productId: null, description: "ERP Manufacturing Module — Textile Edition", quantity: 1, unitPrice: 250000, gstRate: 18, amount: 250000 },
        { productId: null, description: "Implementation & Training (40 hours)", quantity: 40, unitPrice: 1500, gstRate: 18, amount: 60000 },
      ]},
    // 6 - Meridian Foods (cancelled)
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-006",
      status: "cancelled", issueDate: ago(120), dueDate: ago(105),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 75000, cgst: 6750, sgst: 6750, igst: 0, taxTotal: 13500, total: 88500, paidAmount: 0, balanceDue: 0,
      items: [
        { productId: null, description: "Warehouse Automation Feasibility Study", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
      ]},
    // 7 - Nimbus Technologies (sent)
    { organizationId: 1, clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", invoiceNumber: "INV-2026-007",
      status: "sent", issueDate: ago(10), dueDate: later(20),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 346000, cgst: 31140, sgst: 31140, igst: 0, taxTotal: 62280, total: 408280, paidAmount: 0, balanceDue: 408280,
      items: [
        { productId: null, description: "Cloud Migration Suite — Enterprise Edition", quantity: 1, unitPrice: 280000, gstRate: 18, amount: 280000 },
        { productId: null, description: "Data Migration Services (80 hours)", quantity: 80, unitPrice: 825, gstRate: 18, amount: 66000 },
      ]},
    // 8 - Solara Renewable (sent)
    { organizationId: 1, clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-2026-008",
      status: "sent", issueDate: ago(3), dueDate: later(27),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 525800, cgst: 47322, sgst: 47322, igst: 0, taxTotal: 94644, total: 620444, paidAmount: 0, balanceDue: 620444,
      items: [
        { productId: null, description: "SCADA System — Solar Plant Edition", quantity: 1, unitPrice: 420000, gstRate: 18, amount: 420000 },
        { productId: null, description: "IoT Sensor Gateway (15 units)", quantity: 15, unitPrice: 3200, gstRate: 18, amount: 48000 },
        { productId: null, description: "On-site Commissioning (40 hours)", quantity: 40, unitPrice: 1445, gstRate: 18, amount: 57800 },
      ]},
    // 9 - Titan Defence (sent)
    { organizationId: 1, clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-2026-009",
      status: "sent", issueDate: ago(20), dueDate: later(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 697500, cgst: 0, sgst: 0, igst: 125550, taxTotal: 125550, total: 823050, paidAmount: 0, balanceDue: 823050,
      items: [
        { productId: null, description: "Secure Communications Suite — Classified", quantity: 1, unitPrice: 550000, gstRate: 18, amount: 550000 },
        { productId: null, description: "FIPS 140-3 Compliance Module", quantity: 1, unitPrice: 87500, gstRate: 18, amount: 87500 },
        { productId: null, description: "Security Audit & Penetration Testing", quantity: 1, unitPrice: 60000, gstRate: 18, amount: 60000 },
      ]},
    // 10 - Pinnacle Realty (sent)
    { organizationId: 1, clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", invoiceNumber: "INV-2026-010",
      status: "sent", issueDate: ago(7), dueDate: later(23),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 165400, cgst: 14886, sgst: 14886, igst: 0, taxTotal: 29772, total: 195172, paidAmount: 0, balanceDue: 195172,
      items: [
        { productId: null, description: "PropTech Platform — Annual License", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Property Listing Import & Migration", quantity: 1, unitPrice: 25000, gstRate: 18, amount: 25000 },
        { productId: null, description: "CRM Data Migration Services", quantity: 20, unitPrice: 1020, gstRate: 18, amount: 20400 },
      ]},
    // 11 - Delta Automotive (pending/sent)
    { organizationId: 1, clientId: cid("Delta Automotive"), clientName: "Delta Automotive", invoiceNumber: "INV-2026-011",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 265000, cgst: 0, sgst: 0, igst: 47700, taxTotal: 47700, total: 312700, paidAmount: 0, balanceDue: 312700,
      items: [
        { productId: null, description: "MES Platform — Automotive Edition", quantity: 1, unitPrice: 220000, gstRate: 18, amount: 220000 },
        { productId: null, description: "SAP Integration Adapter", quantity: 1, unitPrice: 45000, gstRate: 18, amount: 45000 },
      ]},
    // 12 - Oceanic Pharmaceuticals (draft)
    { organizationId: 1, clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", invoiceNumber: "INV-2026-012",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 753800, cgst: 67842, sgst: 67842, igst: 0, taxTotal: 135684, total: 889484, paidAmount: 0, balanceDue: 889484,
      items: [
        { productId: null, description: "GxP Compliance Suite — Full License", quantity: 1, unitPrice: 580000, gstRate: 18, amount: 580000 },
        { productId: null, description: "GxP Validation Services Package", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Electronic Signature Module", quantity: 1, unitPrice: 53800, gstRate: 18, amount: 53800 },
      ]},
    // 13 - Everest Logistics (sent)
    { organizationId: 1, clientId: cid("Everest Logistics"), clientName: "Everest Logistics", invoiceNumber: "INV-2026-013",
      status: "sent", issueDate: ago(12), dueDate: later(18),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 207600, cgst: 0, sgst: 0, igst: 37368, taxTotal: 37368, total: 244968, paidAmount: 0, balanceDue: 244968,
      items: [
        { productId: null, description: "WMS Platform — Logistics Edition", quantity: 1, unitPrice: 160000, gstRate: 18, amount: 160000 },
        { productId: null, description: "EDI Integration Setup", quantity: 1, unitPrice: 35000, gstRate: 18, amount: 35000 },
        { productId: null, description: "Mobile App — Warehouse Scanner", quantity: 1, unitPrice: 12600, gstRate: 18, amount: 12600 },
      ]},
    // 14 - Velora Hospitality (draft)
    { organizationId: 1, clientId: cid("Velora Hospitality"), clientName: "Velora Hospitality", invoiceNumber: "INV-2026-014",
      status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 114000, cgst: 10260, sgst: 10260, igst: 0, taxTotal: 20520, total: 134520, paidAmount: 0, balanceDue: 134520,
      items: [
        { productId: null, description: "Hotel PMS Software — Base License", quantity: 1, unitPrice: 85000, gstRate: 18, amount: 85000 },
        { productId: null, description: "Channel Manager Integration", quantity: 1, unitPrice: 29000, gstRate: 18, amount: 29000 },
      ]},
    // 15 - Meridian Foods (sent — additional)
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-2026-015",
      status: "sent", issueDate: ago(4), dueDate: later(26),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 106000, cgst: 9540, sgst: 9540, igst: 0, taxTotal: 19080, total: 125080, paidAmount: 0, balanceDue: 125080,
      items: [
        { productId: null, description: "Advanced Analytics Add-on Module", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
        { productId: null, description: "Dashboards & Reports (10 custom)", quantity: 10, unitPrice: 3100, gstRate: 18, amount: 31000 },
      ]},
    // 16 - Starlight Entertainment (sent)
    { organizationId: 1, clientId: cid("Starlight Entertainment"), clientName: "Starlight Entertainment", invoiceNumber: "INV-2026-016",
      status: "sent", issueDate: ago(2), dueDate: later(28),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 66100, cgst: 5949, sgst: 5949, igst: 0, taxTotal: 11898, total: 77998, paidAmount: 0, balanceDue: 77998,
      items: [
        { productId: null, description: "Digital Asset Management Platform", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
        { productId: null, description: "Media Encoding Pipeline Setup", quantity: 1, unitPrice: 18100, gstRate: 18, amount: 18100 },
      ]},
    // 17 - Apex Logistics (paid)
    { organizationId: 1, clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", invoiceNumber: "INV-2026-017",
      status: "paid", issueDate: ago(45), dueDate: ago(15),
      gstTreatment: "interstate", placeOfSupply: "Gujarat",
      subtotal: 85000, cgst: 0, sgst: 0, igst: 15300, taxTotal: 15300, total: 100300, paidAmount: 100300, balanceDue: 0,
      items: [
        { productId: null, description: "Transport Management System — Basic", quantity: 1, unitPrice: 70000, gstRate: 18, amount: 70000 },
        { productId: null, description: "GPS Tracking Integration", quantity: 1, unitPrice: 15000, gstRate: 18, amount: 15000 },
      ]},
    // 18 - Titan Defence (paid — partially)
    { organizationId: 1, clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-2026-018",
      status: "partially_paid", issueDate: ago(40), dueDate: ago(10),
      gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 380000, cgst: 0, sgst: 0, igst: 68400, taxTotal: 68400, total: 448400, paidAmount: 200000, balanceDue: 248400,
      items: [
        { productId: null, description: "Secure Data Center — Rack Integration", quantity: 2, unitPrice: 150000, gstRate: 18, amount: 300000 },
        { productId: null, description: "Hardware Security Module (HSM)", quantity: 2, unitPrice: 40000, gstRate: 18, amount: 80000 },
      ]},
    // 19 - Orbit Health (overdue — repeat)
    { organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-2026-019",
      status: "overdue", issueDate: ago(75), dueDate: ago(45),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 152000, cgst: 13680, sgst: 13680, igst: 0, taxTotal: 27360, total: 179360, paidAmount: 0, balanceDue: 179360,
      items: [
        { productId: null, description: "EHR Data Migration (Phase 1)", quantity: 1, unitPrice: 95000, gstRate: 18, amount: 95000 },
        { productId: null, description: "Legacy System Integration — HL7", quantity: 1, unitPrice: 57000, gstRate: 18, amount: 57000 },
      ]},
    // 20 - Solara Renewable (partially_paid)
    { organizationId: 1, clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-2026-020",
      status: "partially_paid", issueDate: ago(25), dueDate: later(5),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 198000, cgst: 17820, sgst: 17820, igst: 0, taxTotal: 35640, total: 233640, paidAmount: 100000, balanceDue: 133640,
      items: [
        { productId: null, description: "Solar Farm Monitoring — 50MW License", quantity: 1, unitPrice: 150000, gstRate: 18, amount: 150000 },
        { productId: null, description: "Weather Station Integration", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
      ]},
  ];

  const createdInvoices: { id: number; invNum: string; status: string; total: number }[] = [];

  for (const inv of invoices) {
    const { items, ...invData } = inv;
    const created = await prisma.invoice.create({
      data: { ...invData, items: { create: items } },
    });
    createdInvoices.push({ id: created.id, invNum: created.invoiceNumber ?? "", status: created.status, total: Number(created.total) });
    console.log(`  Invoice ${created.invoiceNumber} (${created.status})`);
  }

  // ── PAYMENTS (15+) ────────────────────────────────────────────────
  const payments: PayDef[] = [
    // Linked to invoices
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 177000, paymentMethod: "Bank_Transfer", paymentDate: ago(50), referenceId: "NEFT-MF-001", notes: "Full payment INV-2026-001", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50000, paymentMethod: "UPI", paymentDate: ago(55), referenceId: "UPI-HM-001", notes: "Partial payment INV-2026-003", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[2].id, amount: 50300, paymentMethod: "Cheque", paymentDate: ago(5), referenceId: "CHQ-HM-002", notes: "Overdue payment INV-2026-003 — bounced", status: "failed" },
    { organizationId: 1, invoiceId: createdInvoices[4].id, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(5), referenceId: "NEFT-BT-001", notes: "Partial payment INV-2026-005", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[16].id, amount: 100300, paymentMethod: "UPI", paymentDate: ago(20), referenceId: "UPI-AL-001", notes: "Full payment INV-2026-017", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[17].id, amount: 200000, paymentMethod: "Bank_Transfer", paymentDate: ago(20), referenceId: "NEFT-TD-001", notes: "Partial payment INV-2026-018", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[19].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-SR-001", notes: "Partial payment INV-2026-020", status: "completed" },
    { organizationId: 1, invoiceId: createdInvoices[0].id, amount: 177000, paymentMethod: "Credit_Card", paymentDate: ago(48), referenceId: "CC-MF-001", notes: "Duplicate payment — refunded", status: "refunded" },
    // Standalone payments
    { organizationId: 1, invoiceId: null, amount: 25000, paymentMethod: "UPI", paymentDate: ago(3), referenceId: "UPI-ADV-001", notes: "Advance payment — new project", status: "completed" },
    { organizationId: 1, invoiceId: null, amount: 50000, paymentMethod: "Credit_Card", paymentDate: ago(7), referenceId: "CC-ADV-001", notes: "Subscription renewal — annual", status: "completed" },
    { organizationId: 1, invoiceId: null, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(2), referenceId: "NEFT-MISC-001", notes: "Invoice INV-2026-002 partial", status: "failed" },
    { organizationId: 1, invoiceId: null, amount: 12000, paymentMethod: "Cash", paymentDate: ago(10), referenceId: "CASH-001", notes: "Walk-in — software license purchase", status: "refunded" },
    { organizationId: 1, invoiceId: null, amount: 75000, paymentMethod: "Bank_Transfer", paymentDate: ago(1), referenceId: "NEFT-RETAINER-001", notes: "Q3 retainer — Meridian Foods", status: "completed" },
    { organizationId: 1, invoiceId: null, amount: 32000, paymentMethod: "UPI", paymentDate: ago(4), referenceId: "UPI-CONSULT-001", notes: "Consulting fees — Cirrus Aviation", status: "completed" },
    { organizationId: 1, invoiceId: null, amount: 88000, paymentMethod: "Cheque", paymentDate: ago(8), referenceId: "CHQ-ORBIT-001", notes: "Orbit Health milestone payment", status: "completed" },
    { organizationId: 1, invoiceId: null, amount: 15000, paymentMethod: "UPI", paymentDate: ago(0), referenceId: "UPI-EXP-001", notes: "Expense reimbursement", status: "completed" },
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

  console.log("\nBilling seeding completed successfully!");
  console.log(`Summary: ${invoices.length} invoices, ${payments.length} payments, ${quotations.length} quotes, ${creditNotes.length} credit notes, ${debitNotes.length} debit notes, ${recurring.length} recurring`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
