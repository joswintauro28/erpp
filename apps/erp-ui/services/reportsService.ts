import api from "./api";

export const reportsService = {
  getProfitLoss: (params = {}): Promise<any> => api.get("/reports/profit-loss", { params }),
  getBalanceSheet: (params = {}): Promise<any> => api.get("/reports/balance-sheet", { params }),
  getCashFlow: (params = {}): Promise<any> => api.get("/reports/cash-flow", { params }),
  getTrialBalance: (params = {}): Promise<any> => api.get("/reports/trial-balance", { params }),
  getCharts: (params = {}): Promise<any> => api.get("/reports/charts", { params }),

  // PDF Exports
  exportProfitLossPDF: (params = {}): Promise<any> => api.get("/reports/profit-loss/pdf", { params, responseType: "blob" }),
  exportBalanceSheetPDF: (params = {}): Promise<any> => api.get("/reports/balance-sheet/pdf", { params, responseType: "blob" }),
  exportCashFlowPDF: (params = {}): Promise<any> => api.get("/reports/cash-flow/pdf", { params, responseType: "blob" }),
  exportTrialBalancePDF: (params = {}): Promise<any> => api.get("/reports/trial-balance/pdf", { params, responseType: "blob" }),
};

export default reportsService;
