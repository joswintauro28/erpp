export interface Lead {
  id: number;
  owner_id: number;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  lead_score: number;
  assigned_to: string | null;
  source: string;
  expected_value: number;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
  gst_number: string | null;
  state: string | null;
  address: string | null;
  website: string | null;
  industry: string | null;
  notes: string | null;
  converted_client_id: number | null;
  converted_at: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  gst_number: string;
  state: string;
  address: string;
  website: string;
  industry: string;
  notes: string;
}

export interface ClientDetail extends Client {
  summary: {
    invoice_count: number;
    lifetime_billed: number;
    lifetime_paid: number;
    outstanding: number;
  };
}

export interface PortalAccess {
  status: string;
  invitation_status: string;
  portal_email: string;
  last_login: string;
}

export interface LeadAnalytics {
  total_leads: number;
  conversion_rate: number;
  average_score: number;
  pipeline_value: number;
}

export interface ApiClient {
  id: number; owner_id: number; name: string;
  email: string | null; phone: string | null;
  address: string | null; gst_number: string | null;
  state: string | null; notes: string | null;
  created_at: string;
}

export interface CrmCustomer {
  id: number;
  id_str: string;
  account: string;
  industry: string;
  tier: string;
  arr: number;
  status: string;
  organization_id: number;
  updated_at: string;
}

export interface CrmCustomerSummary {
  total_customers: number;
  open: number;
  overdue_at_risk: number;
  owners: number;
}

export interface CrmCustomersResponse {
  summary: CrmCustomerSummary;
  customers: CrmCustomer[];
}

export interface CrmContact {
  id: number;
  id_str: string;
  name: string;
  role: string;
  account: string;
  email: string;
  phone: string;
  type: string;
  last_contact: string;
  owner: string;
}

export interface CrmDocument {
  id: number;
  id_str: string;
  title: string;
  type: string;
  account: string;
  size: string;
  status: string;
  owner: string;
  updated_at: string;
}

export interface CrmOpportunity {
  id: number;
  id_str: string;
  name: string;
  account: string;
  value: number;
  probability: string;
  close_date: string;
  stage: string;
  owner: string;
}

export interface CrmRequirement {
  id: number;
  id_str: string;
  name: string;
  category: string;
  account: string;
  priority: string;
  status: string;
  owner: string;
}

export interface CrmQuotation {
  id: number;
  id_str: string;
  quote_no: string;
  account: string;
  value: number;
  valid_until: string;
  status: string;
  owner: string;
}

export interface CrmSalesOrder {
  id: number;
  id_str: string;
  so_no: string;
  account: string;
  value: number;
  eta: string;
  status: string;
  owner: string;
}

export interface CrmReport {
  id: number;
  id_str: string;
  name: string;
  title?: string;
  type: string;
  category?: string;
  date?: string;
  last_run?: string;
  generated_at?: string;
  status: string;
  owner: string;
}

export interface CrmAiLog {
  id: number;
  id_str: string;
  query: string;
  response: string;
  category: string;
  status: string;
  created_at: string;
}

export interface CrmSummary {
  total: number;
  open: number;
  overdue_at_risk: number;
  owners: number;
}
