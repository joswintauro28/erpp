import api from "./api";

const paymentService = {
  getAll: () => api.get("/payments/"),
  getById: (id) => api.get(`/payments/${id}`),
  getOutstandingInvoices: () => api.get("/payments/outstanding-invoices"),
  getReport: () => api.get("/payments/reports/summary"),
  create: (data) => api.post("/payments/", data),
  createLink: (data) => api.post("/payments/links", data),
  getLinks: () => api.get("/payments/links"),
  refund: (id, data) => api.post(`/payments/${id}/refund`, data),
  delete: (id) => api.delete(`/payments/${id}`),
};

export default paymentService;
