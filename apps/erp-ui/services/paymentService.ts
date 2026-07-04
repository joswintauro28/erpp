import api from "./api";

const paymentService = {
  getAll: (): Promise<any> => api.get("/payments/"),
  getById: (id: any): Promise<any> => api.get(`/payments/${id}`),
  getOutstandingInvoices: (): Promise<any> => api.get("/payments/outstanding-invoices"),
  getReport: (): Promise<any> => api.get("/payments/reports/summary"),
  create: (data: any): Promise<any> => api.post("/payments/", data),
  createLink: (data: any): Promise<any> => api.post("/payments/links", data),
  getLinks: (): Promise<any> => api.get("/payments/links"),
  refund: (id: any, data: any): Promise<any> => api.post(`/payments/${id}/refund`, data),
  delete: (id: any): Promise<any> => api.delete(`/payments/${id}`),
};

export default paymentService;
