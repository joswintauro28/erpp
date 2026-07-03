import api from "./api";

export const accountingService = {
  getLedger: (params = {}) => api.get("/accounting/ledger", { params }),
};

export default accountingService;
