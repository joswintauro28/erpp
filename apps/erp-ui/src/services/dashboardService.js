import api from "./api";

const dashboardService = {
  getStats: () => api.get("/dashboard/stats"),
  getRecentInvoices: () => api.get("/dashboard/recent-invoices"),
  getRevenueTrend: () => api.get("/dashboard/revenue-trend"),
  getInvoiceSummary: () => api.get("/dashboard/invoice-summary"),
  getSummary: () => api.get("/dashboard/summary"),
  getClientGrowth: () => api.get("/dashboard/client-growth"),
  getPaymentAnalytics: () => api.get("/dashboard/payment-analytics"),
  getRecentStockMovements: () => api.get("/dashboard/recent-stock-movements"),
};

export default dashboardService;
