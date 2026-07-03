import api from "./api";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const invoiceService = {
  getAll: (params = {}) => api.get(`/invoices/${buildQuery(params)}`),
  getById: (id) => api.get(`/invoices/${id}`),
  getDetails: (id) => api.get(`/invoices/${id}/details`),
  create: (data) => api.post("/invoices/", data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
  delete: (id) => api.delete(`/invoices/${id}`),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  emailInvoice: (id, data = {}) => api.post(`/invoices/${id}/email`, data),
  getOverdue: () => api.get("/invoices/overdue"),
  getGstSummary: () => api.get("/invoices/gst-summary"),
};

export default invoiceService;
