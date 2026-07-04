import api from "./api";

const ledgerService = {
  getAll: (): Promise<any> => api.get("/ledger/"),
  create: (data: any): Promise<any> => api.post("/ledger/", data),
};

export default ledgerService;
