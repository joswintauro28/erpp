// Comprehensive billing seed — supporting dev and testing profiles across organizations.
declare const process: any;
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const d = new Date();
const ago = (n: number) => new Date(d.getTime() - n * 86400000);
const later = (n: number) => new Date(d.getTime() + n * 86400000);

const CUSTOMERS = [
  { id: 1, name: "Meridian Foods", state: "Karnataka" },
  { id: 2, name: "Cirrus Aviation", state: "Maharashtra" },
  { id: 3, name: "Halcyon Media", state: "Karnataka" },
  { id: 4, name: "Orbit Health", state: "Karnataka" },
  { id: 5, name: "Bristow Textiles", state: "Tamil Nadu" },
  { id: 6, name: "Apex Logistics Group", state: "Gujarat" },
  { id: 7, name: "Vortex Energy Solutions", state: "Telangana" },
  { id: 8, name: "Nimbus Technologies", state: "Karnataka" },
  { id: 9, name: "Solara Renewable Energy", state: "Karnataka" },
  { id: 10, name: "Cascade Water Solutions", state: "Maharashtra" },
  { id: 11, name: "Pinnacle Realty Group", state: "Karnataka" },
  { id: 12, name: "Neuron AI Research", state: "Delhi" },
  { id: 13, name: "Gardenia Organic Farms", state: "Karnataka" },
  { id: 14, name: "Titan Defence Systems", state: "Telangana" },
  { id: 15, name: "Velora Hospitality", state: "Karnataka" },
  { id: 16, name: "Oceanic Pharmaceuticals", state: "Karnataka" },
  { id: 17, name: "Bright Future Education", state: "Tamil Nadu" },
  { id: 18, name: "Everest Logistics", state: "Maharashtra" },
  { id: 19, name: "Starlight Entertainment", state: "Karnataka" },
  { id: 20, name: "Delta Automotive", state: "Tamil Nadu" },
];

const CUSTOMER_IDS: Record<string, number> = Object.fromEntries(CUSTOMERS.map(c => [c.name, c.id]));

const VENDORS = [
  { id: 1, name: "Siemens India Limited", state: "Maharashtra" },
  { id: 2, name: "Schneider Electric India", state: "Haryana" },
  { id: 3, name: "Philips India Ltd", state: "West Bengal" },
  { id: 4, name: "Omron Automation Pvt Ltd", state: "Karnataka" },
  { id: 5, name: "Honeywell Automation India", state: "Maharashtra" },
  { id: 6, name: "Legrand India Pvt Ltd", state: "Maharashtra" },
  { id: 7, name: "Bosch Power Tools India", state: "Karnataka" },
  { id: 8, name: "Havells India Limited", state: "Uttar Pradesh" },
];

const VENDOR_IDS: Record<string, number> = Object.fromEntries(VENDORS.map(v => [v.name, v.id]));

function cid(name: string): number { return CUSTOMER_IDS[name] || 1; }
function vid(name: string): number { return VENDOR_IDS[name] || 1; }

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

const STANDARD_ACCOUNTS = [
  { code: "1001", name: "Cash & Bank", type: "Asset" as const, subType: "Current Assets", balance: 2850000 },
  { code: "1002", name: "Accounts Receivable", type: "Asset" as const, subType: "Current Assets", balance: 1890000 },
  { code: "1003", name: "Inventory", type: "Asset" as const, subType: "Current Assets", balance: 950000 },
  { code: "1101", name: "Office Equipment", type: "Asset" as const, subType: "Fixed Assets", balance: 450000 },
  { code: "1102", name: "Computer Hardware", type: "Asset" as const, subType: "Fixed Assets", balance: 680000 },
  { code: "2001", name: "Accounts Payable", type: "Liability" as const, subType: "Current Liabilities", balance: 720000 },
  { code: "2002", name: "Short Term Loans", type: "Liability" as const, subType: "Current Liabilities", balance: 350000 },
  { code: "2101", name: "Bank Loan — Term", type: "Liability" as const, subType: "Long Term Debt", balance: 1200000 },
  { code: "3001", name: "Share Capital", type: "Equity" as const, subType: "Capital", balance: 2500000 },
  { code: "3002", name: "Retained Earnings", type: "Equity" as const, subType: "Reserves", balance: 1750000 },
  { code: "4001", name: "Software License Revenue", type: "Revenue" as const, subType: "Operating Revenue", balance: 4200000 },
  { code: "4002", name: "Consulting Services", type: "Revenue" as const, subType: "Operating Revenue", balance: 1850000 },
  { code: "4003", name: "Maintenance & Support", type: "Revenue" as const, subType: "Recurring Revenue", balance: 960000 },
  { code: "5001", name: "Salaries & Wages", type: "Expense" as const, subType: "Operating Expenses", balance: 1200000 },
  { code: "5002", name: "Office Rent", type: "Expense" as const, subType: "Operating Expenses", balance: 360000 },
  { code: "5003", name: "Cloud Infrastructure", type: "Expense" as const, subType: "Operating Expenses", balance: 420000 },
  { code: "5004", name: "Marketing & Advertising", type: "Expense" as const, subType: "Operating Expenses", balance: 180000 },
  { code: "5005", name: "Travel & Conveyance", type: "Expense" as const, subType: "Operating Expenses", balance: 95000 },
];

async function seedAccountsForOrg(orgId: number) {
  const created: { id: number; code: string }[] = [];
  for (const acc of STANDARD_ACCOUNTS) {
    const a = await prisma.account.create({
      data: { ...acc, organizationId: orgId },
    });
    created.push({ id: a.id, code: a.code });
  }

  const mappings = [
    { organizationId: orgId, role: "ROLE_ACCOUNTS_RECEIVABLE", accountId: created.find(a => a.code === "1002")!.id },
    { organizationId: orgId, role: "ROLE_SALES_REVENUE", accountId: created.find(a => a.code === "4001")!.id },
    { organizationId: orgId, role: "ROLE_CASH", accountId: created.find(a => a.code === "1001")!.id },
    { organizationId: orgId, role: "ROLE_BANK", accountId: created.find(a => a.code === "1001")!.id },
    { organizationId: orgId, role: "ROLE_ACCOUNTS_PAYABLE", accountId: created.find(a => a.code === "2001")!.id },
    { organizationId: orgId, role: "ROLE_EXPENSE", accountId: created.find(a => a.code === "5001")!.id },
    { organizationId: orgId, role: "ROLE_TAX_PAYABLE", accountId: created.find(a => a.code === "2001")!.id },
  ];
  for (const am of mappings) {
    await prisma.accountMapping.create({ data: am });
  }
  return created;
}

async function cleanupDb() {
  console.log("Cleaning up existing billing database records...");
  await prisma.reconciliationAuditLog.deleteMany().catch(() => {});
  await prisma.bankTransaction.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.invoiceItem.deleteMany().catch(() => {});
  await prisma.creditNote.deleteMany().catch(() => {});
  await prisma.debitNote.deleteMany().catch(() => {});
  await prisma.dunningRecord.deleteMany().catch(() => {});
  await prisma.quotationItem.deleteMany().catch(() => {});
  await prisma.quotation.deleteMany().catch(() => {});
  await prisma.recurringInvoice.deleteMany().catch(() => {});
  await prisma.invoice.deleteMany().catch(() => {});
  await prisma.ledgerEntry.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.accountMapping.deleteMany().catch(() => {});
  await prisma.account.deleteMany().catch(() => {});
  await prisma.closeSignOff.deleteMany().catch(() => {});
  await prisma.closeAuditLog.deleteMany().catch(() => {});
  await prisma.reopenRequest.deleteMany().catch(() => {});
  await prisma.fiscalPeriod.deleteMany().catch(() => {});
  await prisma.reconciliationToleranceRule.deleteMany().catch(() => {});
}

async function seedDevProfile() {
  console.log("Seeding billing database [Profile: dev]...");

  // ── ORG 1: FULL RICH DATASET (DATAVEX Industries) ─────────────────
  const createdAccountsOrg1 = await seedAccountsForOrg(1);

  const org1Invoices: InvDef[] = [
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0001",
      status: "paid", issueDate: ago(60), dueDate: ago(45), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 150000, discount: 0, cgst: 13500, sgst: 13500, igst: 0, taxTotal: 27000, total: 177000, paidAmount: 162000, balanceDue: 0,
      items: [
        { productId: null, description: "Industrial Automation Controller X200 (5 units)", quantity: 5, unitPrice: 25000, gstRate: 18, amount: 125000 },
        { productId: null, description: "Sensor Array Kit — Proximity (10 units)", quantity: 10, unitPrice: 2500, gstRate: 18, amount: 25000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", invoiceNumber: "INV-202608-0002",
      status: "sent", issueDate: ago(30), dueDate: later(0), gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 420000, discount: 0, cgst: 0, sgst: 0, igst: 75600, taxTotal: 75600, total: 507600, paidAmount: 0, balanceDue: 507600,
      items: [
        { productId: null, description: "Aviation-Grade Telemetry Module (3 units)", quantity: 3, unitPrice: 120000, gstRate: 18, amount: 360000 },
        { productId: null, description: "Flight Data Recorder Interface (2 units)", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Halcyon Media"), clientName: "Halcyon Media", invoiceNumber: "INV-202608-0003",
      status: "overdue", issueDate: ago(90), dueDate: ago(60), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 85000, discount: 0, cgst: 7650, sgst: 7650, igst: 0, taxTotal: 15300, total: 100300, paidAmount: 50000, balanceDue: 42000,
      items: [
        { productId: null, description: "Content Delivery Network Setup (1 year)", quantity: 1, unitPrice: 55000, gstRate: 18, amount: 55000 },
        { productId: null, description: "Media Asset Management License (annual)", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-202608-0004",
      status: "draft", issueDate: null, dueDate: null, gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 230000, discount: 25000, discountType: "fixed", cgst: 18450, sgst: 18450, igst: 0, taxTotal: 36900, total: 241900, paidAmount: 0, balanceDue: 241900,
      items: [
        { productId: null, description: "Healthcare Data Platform — Base License", quantity: 1, unitPrice: 180000, gstRate: 18, amount: 180000 },
        { productId: null, description: "Patient Portal Integration Services", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Bristow Textiles"), clientName: "Bristow Textiles", invoiceNumber: "INV-202608-0005",
      status: "partially_paid", issueDate: ago(15), dueDate: later(15), gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 310000, discount: 0, cgst: 0, sgst: 0, igst: 55800, taxTotal: 55800, total: 365800, paidAmount: 150000, balanceDue: 203300,
      items: [
        { productId: null, description: "ERP Manufacturing Module — Textile Edition", quantity: 1, unitPrice: 250000, gstRate: 18, amount: 250000 },
        { productId: null, description: "Implementation & Training (40 hours)", quantity: 40, unitPrice: 1500, gstRate: 18, amount: 60000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0006",
      status: "void", issueDate: ago(120), dueDate: ago(105), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 75000, discount: 0, cgst: 6750, sgst: 6750, igst: 0, taxTotal: 13500, total: 88500, paidAmount: 0, balanceDue: 0,
      items: [{ productId: null, description: "Warehouse Automation Feasibility Study", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 }]},
    { organizationId: 1, type: "receivable", clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", invoiceNumber: "INV-202608-0007",
      status: "sent", issueDate: ago(10), dueDate: later(20), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 346000, discount: 0, cgst: 31140, sgst: 31140, igst: 0, taxTotal: 62280, total: 408280, paidAmount: 0, balanceDue: 408280,
      items: [
        { productId: null, description: "Cloud Migration Suite — Enterprise Edition", quantity: 1, unitPrice: 280000, gstRate: 18, amount: 280000 },
        { productId: null, description: "Data Migration Services (80 hours)", quantity: 80, unitPrice: 825, gstRate: 18, amount: 66000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-202608-0008",
      status: "sent", issueDate: ago(3), dueDate: later(27), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 525800, discount: 0, cgst: 47322, sgst: 47322, igst: 0, taxTotal: 94644, total: 620444, paidAmount: 0, balanceDue: 620444,
      items: [
        { productId: null, description: "SCADA System — Solar Plant Edition", quantity: 1, unitPrice: 420000, gstRate: 18, amount: 420000 },
        { productId: null, description: "IoT Sensor Gateway (15 units)", quantity: 15, unitPrice: 3200, gstRate: 18, amount: 48000 },
        { productId: null, description: "On-site Commissioning (40 hours)", quantity: 40, unitPrice: 1445, gstRate: 18, amount: 57800 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-202608-0009",
      status: "sent", issueDate: ago(20), dueDate: later(10), gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 697500, discount: 0, cgst: 0, sgst: 0, igst: 125550, taxTotal: 125550, total: 848050, paidAmount: 0, balanceDue: 848050,
      items: [
        { productId: null, description: "Secure Communications Suite — Classified", quantity: 1, unitPrice: 550000, gstRate: 18, amount: 550000 },
        { productId: null, description: "FIPS 140-3 Compliance Module", quantity: 1, unitPrice: 87500, gstRate: 18, amount: 87500 },
        { productId: null, description: "Security Audit & Penetration Testing", quantity: 1, unitPrice: 60000, gstRate: 18, amount: 60000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group", invoiceNumber: "INV-202608-0010",
      status: "sent", issueDate: ago(7), dueDate: later(23), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 165400, discount: 10000, discountType: "fixed", cgst: 13986, sgst: 13986, igst: 0, taxTotal: 27972, total: 183372, paidAmount: 0, balanceDue: 183372,
      items: [
        { productId: null, description: "PropTech Platform — Annual License", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Property Listing Import & Migration", quantity: 1, unitPrice: 25000, gstRate: 18, amount: 25000 },
        { productId: null, description: "CRM Data Migration Services", quantity: 20, unitPrice: 1020, gstRate: 18, amount: 20400 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Delta Automotive"), clientName: "Delta Automotive", invoiceNumber: "INV-202608-0011",
      status: "sent", issueDate: ago(2), dueDate: later(28), gstTreatment: "interstate", placeOfSupply: "Tamil Nadu",
      subtotal: 265000, discount: 0, cgst: 0, sgst: 0, igst: 47700, taxTotal: 47700, total: 312700, paidAmount: 0, balanceDue: 312700,
      items: [
        { productId: null, description: "MES Platform — Automotive Edition", quantity: 1, unitPrice: 220000, gstRate: 18, amount: 220000 },
        { productId: null, description: "SAP Integration Adapter", quantity: 1, unitPrice: 45000, gstRate: 18, amount: 45000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Oceanic Pharmaceuticals"), clientName: "Oceanic Pharmaceuticals", invoiceNumber: "INV-202608-0012",
      status: "draft", issueDate: null, dueDate: null, gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 753800, discount: 0, cgst: 67842, sgst: 67842, igst: 0, taxTotal: 135684, total: 889484, paidAmount: 0, balanceDue: 889484,
      items: [
        { productId: null, description: "GxP Compliance Suite — Full License", quantity: 1, unitPrice: 580000, gstRate: 18, amount: 580000 },
        { productId: null, description: "GxP Validation Services Package", quantity: 1, unitPrice: 120000, gstRate: 18, amount: 120000 },
        { productId: null, description: "Electronic Signature Module", quantity: 1, unitPrice: 53800, gstRate: 18, amount: 53800 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Everest Logistics"), clientName: "Everest Logistics", invoiceNumber: "INV-202608-0013",
      status: "sent", issueDate: ago(12), dueDate: later(18), gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 207600, discount: 0, cgst: 0, sgst: 0, igst: 37368, taxTotal: 37368, total: 244968, paidAmount: 0, balanceDue: 244968,
      items: [
        { productId: null, description: "WMS Platform — Logistics Edition", quantity: 1, unitPrice: 160000, gstRate: 18, amount: 160000 },
        { productId: null, description: "EDI Integration Setup", quantity: 1, unitPrice: 35000, gstRate: 18, amount: 35000 },
        { productId: null, description: "Mobile App — Warehouse Scanner", quantity: 1, unitPrice: 12600, gstRate: 18, amount: 12600 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Velora Hospitality"), clientName: "Velora Hospitality", invoiceNumber: "INV-202608-0014",
      status: "draft", issueDate: null, dueDate: null, gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 114000, discount: 0, cgst: 10260, sgst: 10260, igst: 0, taxTotal: 20520, total: 134520, paidAmount: 0, balanceDue: 134520,
      items: [
        { productId: null, description: "Hotel PMS Software — Base License", quantity: 1, unitPrice: 85000, gstRate: 18, amount: 85000 },
        { productId: null, description: "Channel Manager Integration", quantity: 1, unitPrice: 29000, gstRate: 18, amount: 29000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods", invoiceNumber: "INV-202608-0015",
      status: "sent", issueDate: ago(4), dueDate: later(26), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 106000, discount: 0, cgst: 9540, sgst: 9540, igst: 0, taxTotal: 19080, total: 125080, paidAmount: 0, balanceDue: 125080,
      items: [
        { productId: null, description: "Advanced Analytics Add-on Module", quantity: 1, unitPrice: 75000, gstRate: 18, amount: 75000 },
        { productId: null, description: "Dashboards & Reports (10 custom)", quantity: 10, unitPrice: 3100, gstRate: 18, amount: 31000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Starlight Entertainment"), clientName: "Starlight Entertainment", invoiceNumber: "INV-202608-0016",
      status: "sent", issueDate: ago(2), dueDate: later(28), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 66100, discount: 0, cgst: 5949, sgst: 5949, igst: 0, taxTotal: 11898, total: 77998, paidAmount: 0, balanceDue: 77998,
      items: [
        { productId: null, description: "Digital Asset Management Platform", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
        { productId: null, description: "Media Encoding Pipeline Setup", quantity: 1, unitPrice: 18100, gstRate: 18, amount: 18100 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Apex Logistics Group"), clientName: "Apex Logistics Group", invoiceNumber: "INV-202608-0017",
      status: "paid", issueDate: ago(45), dueDate: ago(15), gstTreatment: "interstate", placeOfSupply: "Gujarat",
      subtotal: 85000, discount: 0, cgst: 0, sgst: 0, igst: 15300, taxTotal: 15300, total: 100300, paidAmount: 100300, balanceDue: 0,
      items: [
        { productId: null, description: "Transport Management System — Basic", quantity: 1, unitPrice: 70000, gstRate: 18, amount: 70000 },
        { productId: null, description: "GPS Tracking Integration", quantity: 1, unitPrice: 15000, gstRate: 18, amount: 15000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Titan Defence Systems"), clientName: "Titan Defence Systems", invoiceNumber: "INV-202608-0018",
      status: "partially_paid", issueDate: ago(40), dueDate: ago(10), gstTreatment: "interstate", placeOfSupply: "Telangana",
      subtotal: 380000, discount: 0, cgst: 0, sgst: 0, igst: 68400, taxTotal: 68400, total: 448400, paidAmount: 200000, balanceDue: 248400,
      items: [
        { productId: null, description: "Secure Data Center — Rack Integration", quantity: 2, unitPrice: 150000, gstRate: 18, amount: 300000 },
        { productId: null, description: "Hardware Security Module (HSM)", quantity: 2, unitPrice: 40000, gstRate: 18, amount: 80000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Orbit Health"), clientName: "Orbit Health", invoiceNumber: "INV-202608-0019",
      status: "overdue", issueDate: ago(75), dueDate: ago(45), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 152000, discount: 0, cgst: 13680, sgst: 13680, igst: 0, taxTotal: 27360, total: 179360, paidAmount: 0, balanceDue: 159360,
      items: [
        { productId: null, description: "EHR Data Migration (Phase 1)", quantity: 1, unitPrice: 95000, gstRate: 18, amount: 95000 },
        { productId: null, description: "Legacy System Integration — HL7", quantity: 1, unitPrice: 57000, gstRate: 18, amount: 57000 },
      ]},
    { organizationId: 1, type: "receivable", clientId: cid("Solara Renewable Energy"), clientName: "Solara Renewable Energy", invoiceNumber: "INV-202608-0020",
      status: "partially_paid", issueDate: ago(25), dueDate: later(5), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 198000, discount: 5000, discountType: "percentage", cgst: 17370, sgst: 17370, igst: 0, taxTotal: 34740, total: 245740, paidAmount: 100000, balanceDue: 145740,
      items: [
        { productId: null, description: "Solar Farm Monitoring — 50MW License", quantity: 1, unitPrice: 150000, gstRate: 18, amount: 150000 },
        { productId: null, description: "Weather Station Integration", quantity: 1, unitPrice: 48000, gstRate: 18, amount: 48000 },
      ]},
    // Vendor bills
    { organizationId: 1, type: "payable", vendorId: vid("Siemens India Limited"), vendorName: "Siemens India Limited", invoiceNumber: "INV-202608-0021",
      status: "draft", issueDate: ago(5), dueDate: later(25), gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 425000, discount: 0, cgst: 0, sgst: 0, igst: 76500, taxTotal: 76500, total: 501500, paidAmount: 0, balanceDue: 501500,
      items: [
        { productId: null, description: "PLC CPU Module — Siemens S7-1200 (300 units)", quantity: 300, unitPrice: 1250, gstRate: 18, amount: 375000 },
        { productId: null, description: "Distributed I/O Interface — Siemens ET200 (50 units)", quantity: 50, unitPrice: 1000, gstRate: 18, amount: 50000 },
      ]},
    { organizationId: 1, type: "payable", vendorId: vid("Schneider Electric India"), vendorName: "Schneider Electric India", invoiceNumber: "INV-202608-0022",
      status: "partially_paid", issueDate: ago(20), dueDate: later(10), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 180000, discount: 0, cgst: 8100, sgst: 8100, igst: 0, taxTotal: 16200, total: 196200, paidAmount: 100000, balanceDue: 96200,
      items: [{ productId: null, description: "Industrial Controller X200 — Schneider Modicon (400 units)", quantity: 400, unitPrice: 450, gstRate: 5, amount: 180000 }]},
    { organizationId: 1, type: "payable", vendorId: vid("Omron Automation Pvt Ltd"), vendorName: "Omron Automation Pvt Ltd", invoiceNumber: "INV-202608-0023",
      status: "sent", issueDate: ago(8), dueDate: later(22), gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 168000, discount: 8000, discountType: "fixed", cgst: 14400, sgst: 14400, igst: 0, taxTotal: 28800, total: 188800, paidAmount: 0, balanceDue: 188800,
      items: [{ productId: null, description: "Photoelectric Sensor — Omron E3Z (60 units)", quantity: 60, unitPrice: 2800, gstRate: 18, amount: 168000 }]},
  ];

  const createdInvoicesOrg1: { id: number; invNum: string; status: string; total: number; type: string }[] = [];
  for (const inv of org1Invoices) {
    const { items, ...invData } = inv;
    const created = await prisma.invoice.create({
      data: { ...invData, items: { create: items } },
    });
    createdInvoicesOrg1.push({ id: created.id, invNum: created.invoiceNumber ?? "", status: created.status, total: Number(created.total), type: created.type });
  }

  // Payments for Org 1
  const org1Payments: PayDef[] = [
    { organizationId: 1, invoiceId: createdInvoicesOrg1[0].id, amount: 162000, paymentMethod: "Bank_Transfer", paymentDate: ago(50), referenceId: "NEFT-MF-001", notes: "Full payment INV-202608-0001 (adjusted for credit note)", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[2].id, amount: 50000, paymentMethod: "UPI", paymentDate: ago(55), referenceId: "UPI-HM-001", notes: "Partial payment INV-202608-0003", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[2].id, amount: 50300, paymentMethod: "Cheque", paymentDate: ago(5), referenceId: "CHQ-HM-002", notes: "Overdue payment INV-202608-0003 — bounced", status: "failed" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[4].id, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(5), referenceId: "NEFT-BT-001", notes: "Partial payment INV-202608-0005", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[16].id, amount: 100300, paymentMethod: "UPI", paymentDate: ago(20), referenceId: "UPI-AL-001", notes: "Full payment INV-202608-0017", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[17].id, amount: 200000, paymentMethod: "Bank_Transfer", paymentDate: ago(20), referenceId: "NEFT-TD-001", notes: "Partial payment INV-202608-0018", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[19].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-SR-001", notes: "Partial payment INV-202608-0020", status: "cleared" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[0].id, amount: 177000, paymentMethod: "Credit_Card", paymentDate: ago(48), referenceId: "CC-MF-001", notes: "Duplicate payment — refunded", status: "refunded" },
    { organizationId: 1, invoiceId: createdInvoicesOrg1[21].id, amount: 100000, paymentMethod: "Bank_Transfer", paymentDate: ago(10), referenceId: "NEFT-UC-001", notes: "Partial payment INV-202608-0022", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 25000, paymentMethod: "UPI", paymentDate: ago(3), referenceId: "UPI-ADV-001", notes: "Advance payment — new project", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 50000, paymentMethod: "Credit_Card", paymentDate: ago(7), referenceId: "CC-ADV-001", notes: "Subscription renewal — annual", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 150000, paymentMethod: "Bank_Transfer", paymentDate: ago(2), referenceId: "NEFT-MISC-001", notes: "Invoice INV-202608-0002 partial", status: "failed" },
    { organizationId: 1, invoiceId: null, amount: 12000, paymentMethod: "Cash", paymentDate: ago(10), referenceId: "CASH-001", notes: "Walk-in — software license purchase", status: "refunded" },
    { organizationId: 1, invoiceId: null, amount: 75000, paymentMethod: "Bank_Transfer", paymentDate: ago(1), referenceId: "NEFT-RETAINER-001", notes: "Q3 retainer — Meridian Foods", status: "cleared" },
    { organizationId: 1, invoiceId: null, amount: 32000, paymentMethod: "UPI", paymentDate: ago(4), referenceId: "UPI-CONSULT-001", notes: "Consulting fees — Cirrus Aviation", status: "pending" },
    { organizationId: 1, invoiceId: null, amount: 88000, paymentMethod: "Cheque", paymentDate: ago(8), referenceId: "CHQ-ORBIT-001", notes: "Orbit Health milestone payment", status: "pending" },
    { organizationId: 1, invoiceId: null, amount: 15000, paymentMethod: "UPI", paymentDate: ago(0), referenceId: "UPI-EXP-001", notes: "Expense reimbursement", status: "pending" },
  ];
  for (const p of org1Payments) {
    await prisma.payment.create({ data: p });
  }

  // Quotations for Org 1 (20)
  const org1Quotes = [
    { organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods", quoteNumber: "QT-202608-0001", total: 132000, status: "accepted" as const, issueDate: ago(45), validUntil: ago(15), notes: "Line automation — photoelectric sensors", items: [{ description: "Photoelectric Sensor — Omron E3Z (SEN-E3Z)", quantity: 30, unitPrice: 2800, gstRate: 18, amount: 84000 }, { description: "Inductive Proximity Sensor — Omron (SEN-PRX12)", quantity: 40, unitPrice: 1200, gstRate: 18, amount: 48000 }] },
    { organizationId: 1, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation", quoteNumber: "QT-202608-0002", total: 300000, status: "accepted" as const, issueDate: ago(35), validUntil: ago(5), notes: "Fleet-wide telemetry upgrade", items: [{ description: "Aviation-Grade Telemetry Module (TEL-AV900)", quantity: 2, unitPrice: 120000, gstRate: 18, amount: 240000 }, { description: "Flight Data Recorder Interface (FDR-INT10)", quantity: 2, unitPrice: 30000, gstRate: 18, amount: 60000 }] },
    { organizationId: 1, clientId: cid("Halcyon Media"), clientName: "Halcyon Media", quoteNumber: "QT-202608-0003", total: 182000, status: "accepted" as const, issueDate: ago(40), validUntil: ago(10), notes: "Control room HMI upgrade", items: [{ description: "HMI Touch Panel 10-inch — Siemens KTP1000", quantity: 3, unitPrice: 42000, gstRate: 18, amount: 126000 }, { description: "HMI Graphic Terminal 7-inch — Schneider", quantity: 2, unitPrice: 28000, gstRate: 18, amount: 56000 }] },
    { organizationId: 1, clientId: cid("Orbit Health"), clientName: "Orbit Health", quoteNumber: "QT-202608-0004", total: 68500, status: "sent" as const, issueDate: ago(12), validUntil: later(18), notes: "Transmitters", items: [{ description: "Smart Temperature Transmitter", quantity: 5, unitPrice: 6500, gstRate: 18, amount: 32500 }] },
    { organizationId: 1, clientId: cid("Nimbus Technologies"), clientName: "Nimbus Technologies", quoteNumber: "QT-202608-0005", total: 25500, status: "accepted" as const, issueDate: ago(20), validUntil: later(10), notes: "IoT edge pilot", items: [{ description: "IoT Gateway Edge Controller", quantity: 3, unitPrice: 8500, gstRate: 18, amount: 25500 }] },
  ];
  for (const q of org1Quotes) {
    const { items, ...qData } = q;
    await prisma.quotation.create({ data: { ...qData, items: { create: items } } });
  }

  // Credit notes for Org 1
  await prisma.creditNote.create({ data: { organizationId: 1, invoiceId: createdInvoicesOrg1[0].id, creditNoteNumber: "CN-202608-0001", amount: 15000, reason: "Damaged goods returned", status: "issued", issueDate: ago(40) } });
  // Debit notes for Org 1
  await prisma.debitNote.create({ data: { organizationId: 1, invoiceId: createdInvoicesOrg1[1].id, debitNoteNumber: "DN-202608-0001", amount: 12000, reason: "Price adjustment", status: "issued", issueDate: ago(20) } });

  // Recurring for Org 1
  await prisma.recurringInvoice.create({
    data: {
      organizationId: 1, clientId: cid("Meridian Foods"), clientName: "Meridian Foods",
      templateName: "Monthly Support Retainer", items: JSON.stringify([{ desc: "Premium Support — 24/7 SLA", qty: 1, rate: 45000 }]),
      total: 53100, frequency: "monthly", nextRun: later(1), endDate: later(365), autoEmail: true, status: "active",
    },
  });

  // Fiscal period Org 1
  await prisma.fiscalPeriod.create({
    data: { organizationId: 1, label: "FY 2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isClosed: false },
  });

  // Dunning record Org 1
  await prisma.dunningRecord.create({
    data: { organizationId: 1, invoiceId: createdInvoicesOrg1[2].id, level: 3, daysOverdue: 60, notifiedAt: new Date(), notes: "Overdue legal notice" },
  });

  // ── ORG 2: MINIMAL DATASET (Eternal) ──────────────────────────────
  await seedAccountsForOrg(2);

  // Collision test: Org 2 has same invoice number INV-202608-0001 as Org 1!
  const org2Inv1 = await prisma.invoice.create({
    data: {
      organizationId: 2, type: "receivable", clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation",
      invoiceNumber: "INV-202608-0001", status: "paid", issueDate: ago(15), dueDate: later(15),
      gstTreatment: "interstate", placeOfSupply: "Maharashtra",
      subtotal: 100000, discount: 0, cgst: 0, sgst: 0, igst: 18000, taxTotal: 18000, total: 118000, paidAmount: 118000, balanceDue: 0,
      items: { create: [{ productId: null, description: "Aviation Telemetry Calibration", quantity: 1, unitPrice: 100000, gstRate: 18, amount: 100000 }] },
    },
  });

  await prisma.invoice.create({
    data: {
      organizationId: 2, type: "receivable", clientId: cid("Halcyon Media"), clientName: "Halcyon Media",
      invoiceNumber: "INV-202608-0002", status: "sent", issueDate: ago(5), dueDate: later(25),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 50000, discount: 0, cgst: 4500, sgst: 4500, igst: 0, taxTotal: 9000, total: 59000, paidAmount: 0, balanceDue: 59000,
      items: { create: [{ productId: null, description: "Media Distribution License", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 }] },
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: 2, invoiceId: org2Inv1.id, amount: 118000, paymentMethod: "Bank_Transfer",
      paymentDate: ago(10), referenceId: "NEFT-ORG2-001", notes: "Full payment Org 2 INV-202608-0001", status: "cleared",
    },
  });

  await prisma.quotation.create({
    data: {
      organizationId: 2, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation",
      quoteNumber: "QT-202608-0001", total: 118000, status: "accepted", issueDate: ago(20), validUntil: later(10),
      notes: "Telemetry maintenance proposal",
      items: { create: [{ description: "Telemetry Maintenance Annual", quantity: 1, unitPrice: 100000, gstRate: 18, amount: 100000 }] },
    },
  });

  await prisma.recurringInvoice.create({
    data: {
      organizationId: 2, clientId: cid("Cirrus Aviation"), clientName: "Cirrus Aviation",
      templateName: "Monthly Telemetry Maintenance", items: JSON.stringify([{ desc: "Maintenance SLA", qty: 1, rate: 25000 }]),
      total: 29500, frequency: "monthly", nextRun: later(5), endDate: later(365), autoEmail: true, status: "active",
    },
  });

  await prisma.fiscalPeriod.create({
    data: { organizationId: 2, label: "FY 2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isClosed: false },
  });

  // ── ORG 3: MINIMAL DATASET (Zomato) ───────────────────────────────
  await seedAccountsForOrg(3);
  await prisma.invoice.create({
    data: {
      organizationId: 3, type: "receivable", clientId: cid("Meridian Foods"), clientName: "Meridian Foods",
      invoiceNumber: "INV-202608-0001", status: "sent", issueDate: ago(3), dueDate: later(27),
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 40000, discount: 0, cgst: 3600, sgst: 3600, igst: 0, taxTotal: 7200, total: 47200, paidAmount: 0, balanceDue: 47200,
      items: { create: [{ productId: null, description: "Fleet Logistics Integration", quantity: 1, unitPrice: 40000, gstRate: 18, amount: 40000 }] },
    },
  });
  await prisma.quotation.create({
    data: {
      organizationId: 3, clientId: cid("Meridian Foods"), clientName: "Meridian Foods",
      quoteNumber: "QT-202608-0001", total: 47200, status: "sent", issueDate: ago(5), validUntil: later(25),
      notes: "Logistics integration quote",
      items: { create: [{ description: "Fleet Logistics Integration", quantity: 1, unitPrice: 40000, gstRate: 18, amount: 40000 }] },
    },
  });

  // ── ORG 4: SPARSE DATASET (Blinkit) ───────────────────────────────
  await seedAccountsForOrg(4);
  await prisma.invoice.create({
    data: {
      organizationId: 4, type: "receivable", clientId: cid("Pinnacle Realty Group"), clientName: "Pinnacle Realty Group",
      invoiceNumber: "INV-202608-0001", status: "draft", issueDate: null, dueDate: null,
      gstTreatment: "intrastate", placeOfSupply: "Karnataka",
      subtotal: 30000, discount: 0, cgst: 2700, sgst: 2700, igst: 0, taxTotal: 5400, total: 35400, paidAmount: 0, balanceDue: 35400,
      items: { create: [{ productId: null, description: "Warehouse Dark Store Audit", quantity: 1, unitPrice: 30000, gstRate: 18, amount: 30000 }] },
    },
  });

  // ── ORG 5: EMPTY INVOICE STATE (District) ─────────────────────────
  await seedAccountsForOrg(5);
  // Strictly 0 invoices, 0 payments, 0 quotes to test empty-state UI/API

  console.log("Dev profile seeding finished!");
}

async function seedTestingProfile() {
  console.log("Seeding billing database [Profile: testing]...");

  // Seed chart of accounts for all 5 orgs
  for (let o = 1; o <= 5; o++) {
    await seedAccountsForOrg(o);
  }

  // Helper to generate bulk invoices for an org
  const generateInvoices = async (orgId: number, count: number, prefix: string) => {
    const statuses: ("draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void")[] = [
      "paid", "sent", "partially_paid", "overdue", "draft", "void"
    ];

    const invoicesToCreate: any[] = [];
    for (let i = 1; i <= count; i++) {
      const cust = CUSTOMERS[(i - 1) % CUSTOMERS.length];
      const invNum = i === 1 ? "INV-202608-0001" : `${prefix}-${String(i).padStart(4, "0")}`;
      const status = statuses[(i - 1) % statuses.length];
      const isInterstate = cust.state !== "Karnataka";

      // Edge cases for Org 1
      let subtotal = ((i * 17) % 50 + 10) * 1000;
      let total = Math.round(subtotal * 1.18);
      let paidAmount = 0;
      let balanceDue = total;

      if (orgId === 1 && i === 2) {
        // Zero-amount invoice
        subtotal = 0;
        total = 0;
        paidAmount = 0;
        balanceDue = 0;
      } else if (orgId === 1 && i === 3) {
        // Overpaid invoice
        subtotal = 10000;
        total = 11800;
        paidAmount = 15000;
        balanceDue = 0;
      } else if (status === "paid") {
        paidAmount = total;
        balanceDue = 0;
      } else if (status === "partially_paid") {
        paidAmount = Math.round(total * 0.4);
        balanceDue = total - paidAmount;
      } else if (status === "void") {
        paidAmount = 0;
        balanceDue = 0;
      }

      const cgst = isInterstate ? 0 : Math.round(subtotal * 0.09);
      const sgst = isInterstate ? 0 : Math.round(subtotal * 0.09);
      const igst = isInterstate ? Math.round(subtotal * 0.18) : 0;
      const taxTotal = cgst + sgst + igst;

      const issueDate = status === "draft" ? null : ago((i % 90) + 1);
      const dueDate = status === "draft" ? null : (status === "overdue" ? ago((i % 30) + 10) : later(30 - (i % 25)));

      const items = (orgId === 1 && i === 5)
        ? Array.from({ length: 10 }, (_, itemIdx) => ({
            productId: null,
            description: `Batch component line #${itemIdx + 1}`,
            quantity: 2,
            unitPrice: Math.round(subtotal / 20),
            gstRate: 18,
            amount: Math.round(subtotal / 10),
          }))
        : [
            {
              productId: null,
              description: `Automated Service Package (${cust.name})`,
              quantity: 1,
              unitPrice: subtotal,
              gstRate: 18,
              amount: subtotal,
            },
          ];

      invoicesToCreate.push({
        organizationId: orgId,
        type: "receivable" as const,
        clientId: cust.id,
        clientName: cust.name,
        invoiceNumber: invNum,
        status,
        issueDate,
        dueDate,
        gstTreatment: isInterstate ? ("interstate" as const) : ("intrastate" as const),
        placeOfSupply: cust.state,
        subtotal,
        discount: 0,
        cgst,
        sgst,
        igst,
        taxTotal,
        total,
        paidAmount,
        balanceDue,
        items,
      });
    }

    const createdIds: { id: number; invNum: string; status: string; total: number }[] = [];
    for (const inv of invoicesToCreate) {
      const { items, ...invData } = inv;
      const created = await prisma.invoice.create({
        data: { ...invData, items: { create: items } },
      });
      createdIds.push({ id: created.id, invNum: created.invoiceNumber ?? "", status: created.status, total: Number(created.total) });
    }
    return createdIds;
  };

  // 1. Org 1: 500 invoices
  console.log("  Generating 500 bulk invoices for Org 1...");
  const org1Invs = await generateInvoices(1, 500, "INV-TST");

  // 2. Org 2: 50 invoices (with INV-202608-0001 collision)
  console.log("  Generating 50 invoices for Org 2...");
  const org2Invs = await generateInvoices(2, 50, "INV-O2");

  // 3. Org 3: 20 invoices
  console.log("  Generating 20 invoices for Org 3...");
  const org3Invs = await generateInvoices(3, 20, "INV-O3");

  // 4. Org 4: 5 invoices
  console.log("  Generating 5 invoices for Org 4...");
  await generateInvoices(4, 5, "INV-O4");

  // 5. Org 5: 0 invoices (strictly empty)
  console.log("  Org 5 left with 0 invoices (empty-state verification).");

  // Seed bulk payments for Org 1 (200 payments)
  console.log("  Generating 200 payments for Org 1...");
  const payMethods: ("Bank_Transfer"|"UPI"|"Credit_Card"|"Cheque"|"Cash")[] = ["Bank_Transfer", "UPI", "Credit_Card", "Cheque", "Cash"];
  const payStatuses: ("cleared"|"pending"|"failed"|"refunded")[] = ["cleared", "cleared", "cleared", "pending", "failed", "refunded"];

  for (let i = 1; i <= 200; i++) {
    const inv = org1Invs[(i - 1) % org1Invs.length];
    const isLinked = i % 5 !== 0;
    const amount = isLinked ? Math.round(inv.total > 0 ? inv.total * 0.5 : 5000) : ((i % 10) + 1) * 10000;
    const method = payMethods[(i - 1) % payMethods.length];
    const status = payStatuses[(i - 1) % payStatuses.length];

    await prisma.payment.create({
      data: {
        organizationId: 1,
        invoiceId: isLinked ? inv.id : null,
        amount,
        paymentMethod: method,
        paymentDate: ago(i % 60),
        referenceId: `PAY-TST-${String(i).padStart(4, "0")}`,
        notes: `Bulk test payment #${i} (${status})`,
        status,
      },
    });
  }

  // Seed 20 payments for Org 2
  for (let i = 1; i <= 20; i++) {
    const inv = org2Invs[(i - 1) % org2Invs.length];
    await prisma.payment.create({
      data: {
        organizationId: 2,
        invoiceId: inv.id,
        amount: Math.round(inv.total > 0 ? inv.total * 0.5 : 5000),
        paymentMethod: payMethods[i % payMethods.length],
        paymentDate: ago(i % 30),
        referenceId: `PAY-O2-${String(i).padStart(3, "0")}`,
        notes: `Org 2 payment #${i}`,
        status: "cleared",
      },
    });
  }

  // Seed 200 quotations for Org 1
  console.log("  Generating 200 quotations for Org 1...");
  const quoteStatuses: ("draft" | "sent" | "accepted" | "rejected" | "expired")[] = [
    "draft", "sent", "accepted", "rejected", "expired"
  ];
  for (let i = 1; i <= 200; i++) {
    const cust = CUSTOMERS[(i - 1) % CUSTOMERS.length];
    const total = ((i * 13) % 40 + 5) * 10000;
    const status = quoteStatuses[(i - 1) % quoteStatuses.length];
    await prisma.quotation.create({
      data: {
        organizationId: 1,
        clientId: cust.id,
        clientName: cust.name,
        quoteNumber: `QT-TST-${String(i).padStart(4, "0")}`,
        total,
        status,
        issueDate: status === "draft" ? null : ago((i % 45) + 1),
        validUntil: status === "draft" ? null : later(30 - (i % 20)),
        notes: `Bulk quotation #${i}`,
        items: {
          create: [
            { description: `Telemetry & Automation Package ${i}`, quantity: 2, unitPrice: total / 2, gstRate: 18, amount: total },
          ],
        },
      },
    });
  }

  // Seed 25 quotations for Org 2
  for (let i = 1; i <= 25; i++) {
    const cust = CUSTOMERS[(i - 1) % CUSTOMERS.length];
    await prisma.quotation.create({
      data: {
        organizationId: 2,
        clientId: cust.id,
        clientName: cust.name,
        quoteNumber: `QT-O2-${String(i).padStart(3, "0")}`,
        total: 50000,
        status: "accepted",
        issueDate: ago(10),
        validUntil: later(20),
        notes: `Org 2 quote #${i}`,
        items: { create: [{ description: "Service License", quantity: 1, unitPrice: 50000, gstRate: 18, amount: 50000 }] },
      },
    });
  }

  // Recurring invoices
  for (let i = 1; i <= 10; i++) {
    const cust = CUSTOMERS[(i - 1) % CUSTOMERS.length];
    await prisma.recurringInvoice.create({
      data: {
        organizationId: 1,
        clientId: cust.id,
        clientName: cust.name,
        templateName: `Subscription Retainer Plan #${i}`,
        items: JSON.stringify([{ desc: "Enterprise SLA", qty: 1, rate: 30000 }]),
        total: 35400,
        frequency: "monthly",
        nextRun: later(i * 3),
        endDate: later(365),
        autoEmail: true,
        status: i % 2 === 0 ? "active" : "paused",
      },
    });
  }

  // Credit notes & debit notes for Org 1
  for (let i = 1; i <= 15; i++) {
    const inv = org1Invs[i * 2];
    await prisma.creditNote.create({
      data: {
        organizationId: 1,
        invoiceId: inv.id,
        creditNoteNumber: `CN-TST-${String(i).padStart(4, "0")}`,
        amount: 5000,
        reason: `Rebate discount test #${i}`,
        status: "issued",
        issueDate: ago(i * 2),
      },
    });
  }
  for (let i = 1; i <= 10; i++) {
    const inv = org1Invs[i * 3];
    await prisma.debitNote.create({
      data: {
        organizationId: 1,
        invoiceId: inv.id,
        debitNoteNumber: `DN-TST-${String(i).padStart(4, "0")}`,
        amount: 7500,
        reason: `Price adjustment test #${i}`,
        status: "issued",
        issueDate: ago(i * 2),
      },
    });
  }

  // Fiscal periods Org 1 & 2
  await prisma.fiscalPeriod.create({
    data: { organizationId: 1, label: "FY 2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isClosed: false },
  });
  await prisma.fiscalPeriod.create({
    data: { organizationId: 2, label: "FY 2025-2026", startDate: new Date("2025-04-01"), endDate: new Date("2026-03-31"), isClosed: false },
  });

  // Dunning records for overdue invoices
  const overdueOrg1 = org1Invs.filter(inv => inv.status === "overdue").slice(0, 10);
  for (const od of overdueOrg1) {
    await prisma.dunningRecord.create({
      data: {
        organizationId: 1,
        invoiceId: od.id,
        level: 2,
        daysOverdue: 35,
        notifiedAt: new Date(),
        notes: `Bulk dunning overdue reminder for ${od.invNum}`,
      },
    });
  }

  console.log("Testing profile seeding finished successfully!");
}

async function main() {
  const profile = process.env.SEED_PROFILE || (process.argv.includes("--testing") || process.argv.includes("--profile=testing") ? "testing" : "dev");
  console.log(`Starting billing-service seed [Profile: ${profile}]...`);

  await cleanupDb();

  if (profile === "testing") {
    await seedTestingProfile();
  } else {
    await seedDevProfile();
  }

  console.log("Billing service seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
