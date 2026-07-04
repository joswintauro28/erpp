import api from "./api";

export const accountingService = {
  getLedger: (params = {}): Promise<any> => api.get("/accounting/ledger", { params }),
};

export default accountingService;
