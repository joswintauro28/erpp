export interface ColumnDef {
  key: string;
  label: string;
  primary?: boolean;
  link?: boolean;
  badge?: boolean;
  format?: "currency" | "currency2";
}

export interface MetricDef {
  key: string;
  label: string;
  trend: string;
  trendNegative?: boolean;
}

export interface FilterDef {
  label: string;
  options?: string[];
}

export interface EntityDef {
  section?: string;
  title: string;
  description: string;
  entityName: string;
  apiEndpoint: string;
  dataKey: string;
  metrics: MetricDef[];
  searchPlaceholder: string;
  filters: FilterDef[];
  columns: ColumnDef[];
  detailsModal: "generic" | "lead" | "document";
  hideConverted?: boolean;
}

export const entities: Record<string, EntityDef> = {
  customers: {
    title: "Customer Management",
    description: "Central directory of every account you serve.",
    entityName: "Customer",
    apiEndpoint: "/customers",
    dataKey: "customers",
    metrics: [
      { key: "total_customers", label: "TOTAL CUSTOMERS", trend: "+4 this week" },
      { key: "open", label: "OPEN", trend: "on track" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search customers...",
    filters: [
      { label: "Status: All", options: ["Active", "Prospect", "Dormant", "Churned"] },
      { label: "Tier: All", options: ["Platinum", "Gold", "Silver", "Bronze"] },
    ],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "account", label: "ACCOUNT", link: true },
      { key: "industry", label: "INDUSTRY" },
      { key: "tier", label: "TIER" },
      { key: "arr", label: "ARR", format: "currency2" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "generic",
  },

  contacts: {
    section: "CORE",
    title: "Contact Management",
    description: "Contact directory and communication records.",
    entityName: "Contact",
    apiEndpoint: "/contacts",
    dataKey: "contacts",
    metrics: [
      { key: "total_contacts", label: "TOTAL CONTACTS", trend: "contact directory" },
      { key: "open", label: "OPEN", trend: "active contacts" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search contacts...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "NAME", link: true },
      { key: "company", label: "COMPANY" },
      { key: "email", label: "EMAIL" },
      { key: "phone", label: "PHONE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "generic",
  },

  documents: {
    title: "Document Management",
    description: "Contracts, proposals, and collateral in one library.",
    entityName: "Document",
    apiEndpoint: "/documents",
    dataKey: "documents",
    metrics: [
      { key: "total_documents", label: "TOTAL DOCUMENTS", trend: "library items" },
      { key: "open", label: "OPEN", trend: "active review" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "expired items", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search documents...",
    filters: [
      { label: "Type: All" },
      { label: "Status: All" },
    ],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "NAME", link: true },
      { key: "type", label: "TYPE" },
      { key: "account", label: "ACCOUNT" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "document",
  },

  leads: {
    section: "SALES",
    title: "Lead Management",
    description: "Capture, qualify and route inbound leads across channels.",
    entityName: "Lead",
    apiEndpoint: "/leads",
    dataKey: "leads",
    metrics: [
      { key: "total_leads", label: "TOTAL LEADS", trend: "leads in pipeline" },
      { key: "open", label: "OPEN", trend: "open leads" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "lost leads", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search leads...",
    filters: [
      { label: "Status: All" },
      { label: "Source: All" },
    ],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "LEAD", link: true },
      { key: "company", label: "COMPANY" },
      { key: "source", label: "SOURCE" },
      { key: "est_value", label: "EST. VALUE", format: "currency" },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "lead",
    hideConverted: true,
  },

  opportunities: {
    section: "SALES",
    title: "Opportunity Management",
    description: "Track deals through discovery, proposal and close.",
    entityName: "Opportunity",
    apiEndpoint: "/opportunities",
    dataKey: "opportunities",
    metrics: [
      { key: "total_opportunities", label: "TOTAL OPPORTUNITIES", trend: "deals pipeline" },
      { key: "open", label: "OPEN", trend: "open opportunities" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "lost deals", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search opportunities...",
    filters: [{ label: "Stage: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "DEAL", link: true },
      { key: "account", label: "ACCOUNT" },
      { key: "value", label: "VALUE", format: "currency" },
      { key: "probability", label: "PROBABILITY" },
      { key: "close_date", label: "CLOSE DATE" },
      { key: "stage", label: "STAGE", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  sales: {
    section: "SALES",
    title: "Sales",
    description: "Live view of booked revenue and pipeline movement.",
    entityName: "Sale",
    apiEndpoint: "/sales",
    dataKey: "sales",
    metrics: [
      { key: "total_sales", label: "TOTAL SALES", trend: "invoices generated" },
      { key: "open", label: "OPEN", trend: "pending payment" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "overdue invoices", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search sales...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "invoice_no", label: "INVOICE #", link: true },
      { key: "account", label: "ACCOUNT" },
      { key: "amount", label: "AMOUNT", format: "currency" },
      { key: "issued_date", label: "ISSUED" },
      { key: "due_date", label: "DUE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "rep", label: "REP" },
    ],
    detailsModal: "generic",
  },

  requirements: {
    section: "SALES",
    title: "Requirement Management",
    description: "Structured customer requirements feeding proposals.",
    entityName: "Requirement",
    apiEndpoint: "/requirements",
    dataKey: "requirements",
    metrics: [
      { key: "total_requirements", label: "TOTAL REQUIREMENTS", trend: "requirements logged" },
      { key: "open", label: "OPEN", trend: "under review" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "cancelled", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search requirements...",
    filters: [
      { label: "Status: All" },
      { label: "Priority: All" },
    ],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "REQUIREMENT", link: true },
      { key: "account", label: "ACCOUNT" },
      { key: "priority", label: "PRIORITY", badge: true },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "generic",
  },

  quotations: {
    section: "SALES",
    title: "Quotation Management",
    description: "Proposal generation and tracking.",
    entityName: "Quotation",
    apiEndpoint: "/quotations",
    dataKey: "quotations",
    metrics: [
      { key: "total_quotations", label: "TOTAL QUOTATIONS", trend: "proposals sent" },
      { key: "open", label: "OPEN", trend: "awaiting response" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "expired", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search quotations...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "name", label: "QUOTATION", link: true },
      { key: "account", label: "ACCOUNT" },
      { key: "amount", label: "AMOUNT", format: "currency" },
      { key: "issued_date", label: "ISSUED" },
      { key: "valid_till", label: "VALID TILL" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  "sales-orders": {
    section: "SALES",
    title: "Sales Order Management",
    description: "Sales order processing and fulfillment.",
    entityName: "Sales Order",
    apiEndpoint: "/sales-orders",
    dataKey: "sales_orders",
    metrics: [
      { key: "total_sales_orders", label: "TOTAL SALES ORDERS", trend: "orders processed" },
      { key: "open", label: "OPEN", trend: "in fulfillment" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "delayed", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active reps" },
    ],
    searchPlaceholder: "Search sales orders...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "order_no", label: "SO #", link: true },
      { key: "account", label: "ACCOUNT" },
      { key: "amount", label: "AMOUNT", format: "currency" },
      { key: "issued_date", label: "ISSUED" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  enquiries: {
    section: "ENGAGEMENT",
    title: "Enquiries",
    description: "Manage incoming questions and requests.",
    entityName: "Enquiry",
    apiEndpoint: "/enquiries",
    dataKey: "enquiries",
    metrics: [
      { key: "total", label: "TOTAL", trend: "active" },
      { key: "active", label: "ACTIVE / OPEN", trend: "on track" },
      { key: "attention", label: "ATTENTION", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "subject", label: "SUBJECT", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "source", label: "SOURCE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "generic",
  },

  "site-visits": {
    section: "ENGAGEMENT",
    title: "Site Visits",
    description: "Site visit scheduling and records.",
    entityName: "Site Visit",
    apiEndpoint: "/site-visits",
    dataKey: "site_visits",
    metrics: [
      { key: "total_site_visits", label: "TOTAL VISITS", trend: "scheduled" },
      { key: "open", label: "OPEN", trend: "upcoming" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "missed", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search site visits...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "site", label: "SITE", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "date", label: "DATE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  "follow-ups": {
    section: "ENGAGEMENT",
    title: "Follow-ups",
    description: "Customer follow-up tracking.",
    entityName: "Follow-up",
    apiEndpoint: "/follow-ups",
    dataKey: "follow_ups",
    metrics: [
      { key: "total_follow_ups", label: "TOTAL FOLLOW-UPS", trend: "logged" },
      { key: "open", label: "OPEN", trend: "pending" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "overdue", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search follow-ups...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "subject", label: "SUBJECT", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "due_date", label: "DUE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  tasks: {
    section: "ENGAGEMENT",
    title: "Task Management",
    description: "Task management and assignment.",
    entityName: "Task",
    apiEndpoint: "/tasks",
    dataKey: "tasks",
    metrics: [
      { key: "total_tasks", label: "TOTAL TASKS", trend: "registered" },
      { key: "open", label: "OPEN", trend: "in progress" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "overdue", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search tasks...",
    filters: [
      { label: "Status: All" },
      { label: "Priority: All" },
    ],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "task", label: "TASK", link: true },
      { key: "assignee", label: "ASSIGNEE" },
      { key: "due_date", label: "DUE" },
      { key: "priority", label: "PRIORITY", badge: true },
      { key: "status", label: "STATUS", badge: true },
    ],
    detailsModal: "generic",
  },

  comms: {
    section: "ENGAGEMENT",
    title: "Communications",
    description: "Communication history and logs.",
    entityName: "Communication",
    apiEndpoint: "/comms",
    dataKey: "comms",
    metrics: [
      { key: "total_comms", label: "TOTAL COMMUNICATIONS", trend: "logged" },
      { key: "open", label: "OPEN", trend: "pending response" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search communications...",
    filters: [{ label: "Channel: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "subject", label: "SUBJECT", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "channel", label: "CHANNEL" },
      { key: "date", label: "DATE" },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  "visit-planner": {
    section: "ENGAGEMENT",
    title: "Visit Planner",
    description: "Field visit planning and route optimization.",
    entityName: "Visit Plan",
    apiEndpoint: "/visit-planner",
    dataKey: "visit_plans",
    metrics: [
      { key: "total_plans", label: "TOTAL PLANS", trend: "scheduled" },
      { key: "open", label: "OPEN", trend: "planned" },
      { key: "overdue_at_risk", label: "OVERDUE / AT RISK", trend: "missed", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search visit plans...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "route", label: "ROUTE", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "date", label: "DATE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
    ],
    detailsModal: "generic",
  },

  complaints: {
    section: "ENGAGEMENT",
    title: "Complaints",
    description: "Customer complaint resolution tracking.",
    entityName: "Complaint",
    apiEndpoint: "/complaints",
    dataKey: "complaints",
    metrics: [
      { key: "total", label: "TOTAL", trend: "active" },
      { key: "active", label: "ACTIVE / OPEN", trend: "on track" },
      { key: "attention", label: "ATTENTION", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "subject", label: "SUBJECT", link: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "priority", label: "PRIORITY", badge: true },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "updated_at", label: "UPDATED" },
    ],
    detailsModal: "generic",
  },

  feedback: {
    section: "ENGAGEMENT",
    title: "Feedback",
    description: "Customer feedback and satisfaction scoring.",
    entityName: "Feedback",
    apiEndpoint: "/feedback",
    dataKey: "feedback",
    metrics: [
      { key: "total", label: "TOTAL", trend: "active" },
      { key: "active", label: "ACTIVE / OPEN", trend: "on track" },
      { key: "attention", label: "ATTENTION", trend: "attention", trendNegative: true },
      { key: "owners", label: "REPRESENTATIVES", trend: "active" },
    ],
    searchPlaceholder: "Search...",
    filters: [{ label: "Status: All" }],
    columns: [
      { key: "id_str", label: "ID", primary: true },
      { key: "customer", label: "CUSTOMER" },
      { key: "score", label: "SCORE" },
      { key: "status", label: "STATUS", badge: true },
      { key: "owner", label: "OWNER" },
      { key: "date", label: "DATE" },
    ],
    detailsModal: "generic",
  },
};
