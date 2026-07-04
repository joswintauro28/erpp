import api from "./api";

const recurringInvoiceService = {
  getAll: (): Promise<any> => api.get("/recurring/"),
  getById: (id: any): Promise<any> => api.get(`/recurring/${id}`),
  create: (data: any): Promise<any> => api.post("/recurring/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/recurring/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/recurring/${id}`),
  pause: (id: any): Promise<any> => api.post(`/recurring/${id}/pause`),
  resume: (id: any): Promise<any> => api.post(`/recurring/${id}/resume`),
  runNow: (id: any): Promise<any> => api.post(`/recurring/${id}/run-now`),
};

export default recurringInvoiceService;
