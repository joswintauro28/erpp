export interface DashboardData {
  stats: {
    total_clients: number;
    total_invoices: number;
    total_revenue: number;
    outstanding_revenue: number;
    overdue_amount: number;
    total_products: number;
    low_stock_count: number;
    pipeline_value: number;
    open_opportunities: number;
    total_customers: number;
    total_leads: number;
  } | null;
  revenueTrend: { month: string; revenue: number }[];
  invoiceSummary: { name: string; value: number; count: number }[];
  paymentAnalytics: { method: string; amount: number }[];
  recentInvoices: {
    id: number;
    invoice_number: string;
    client_name: string;
    total: number;
    status: string;
    due_date: string | null;
    created_at: string;
  }[];
  alerts: {
    overdue_invoices: number;
    low_stock_products: number;
  };
  clientGrowth: { month: string; count: number }[];
  crmDashboard: {
    metrics: any[];
    pipeline_stages: any[];
    recommendations: any[];
  } | null;
  pipelineValue: number;
  pipelineStages: any[];
  recommendations: any[];
}
