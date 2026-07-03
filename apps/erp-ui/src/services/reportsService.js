import api from "./api";

export const reportsService = {
  getProfitLoss: (params = {}) => api.get("/reports/profit-loss", { params }),
  getBalanceSheet: (params = {}) => api.get("/reports/balance-sheet", { params }),
  getCashFlow: (params = {}) => api.get("/reports/cash-flow", { params }),
  getTrialBalance: (params = {}) => api.get("/reports/trial-balance", { params }),
  getCharts: (params = {}) => api.get("/reports/charts", { params }),

  // PDF Exports
  exportProfitLossPDF: (params = {}) => api.get("/reports/profit-loss/pdf", { params, responseType: "blob" }),
  exportBalanceSheetPDF: (params = {}) => api.get("/reports/balance-sheet/pdf", { params, responseType: "blob" }),
  exportCashFlowPDF: (params = {}) => api.get("/reports/cash-flow/pdf", { params, responseType: "blob" }),
  exportTrialBalancePDF: (params = {}) => api.get("/reports/trial-balance/pdf", { params, responseType: "blob" }),
};

export default reportsService;
