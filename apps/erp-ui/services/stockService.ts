import api from "./api";

const stockService = {
  getAll: (): Promise<any> => api.get("/stock/"),
  getLowStock: (): Promise<any> => api.get("/stock/low-stock"),
  create: (data: any): Promise<any> => api.post("/stock/", data),
};

export default stockService;
