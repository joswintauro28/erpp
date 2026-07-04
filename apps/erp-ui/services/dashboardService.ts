import api from "./api";

const dashboardService = {
  getStats: (): Promise<any> => api.get("/dashboard/stats"),
  getRecentInvoices: (): Promise<any> => api.get("/dashboard/recent-invoices"),
  getRevenueTrend: (): Promise<any> => api.get("/dashboard/revenue-trend"),
  getInvoiceSummary: (): Promise<any> => api.get("/dashboard/invoice-summary"),
  getSummary: (): Promise<any> => api.get("/dashboard/summary"),
  getClientGrowth: (): Promise<any> => api.get("/dashboard/client-growth"),
  getPaymentAnalytics: (): Promise<any> => api.get("/dashboard/payment-analytics"),
  getRecentStockMovements: (): Promise<any> => api.get("/dashboard/recent-stock-movements"),
};

export default dashboardService;
