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
