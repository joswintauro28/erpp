import api from "./api";

const recurringInvoiceService = {
  getAll: () => api.get("/recurring/"),
  getById: (id) => api.get(`/recurring/${id}`),
  create: (data) => api.post("/recurring/", data),
  update: (id, data) => api.put(`/recurring/${id}`, data),
  delete: (id) => api.delete(`/recurring/${id}`),
  pause: (id) => api.post(`/recurring/${id}/pause`),
  resume: (id) => api.post(`/recurring/${id}/resume`),
  runNow: (id) => api.post(`/recurring/${id}/run-now`),
};

export default recurringInvoiceService;
