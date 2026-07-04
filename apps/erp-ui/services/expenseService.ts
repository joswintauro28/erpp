import api from "./api";

export const expenseService = {
  getAll: (): Promise<any> => api.get("/expenses/"),
  getSummary: (): Promise<any> => api.get("/expenses/summary"),
  create: (data: any): Promise<any> => api.post("/expenses/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/expenses/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/expenses/${id}`),
};

export default expenseService;
