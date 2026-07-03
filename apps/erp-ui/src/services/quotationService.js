import api from "./api";

export const quotationService = {
  getAll: (limit = 100, skip = 0, search = "", status = "") => {
    const params = new URLSearchParams({ limit, skip });
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    return api.get(`/quotations/?${params.toString()}`);
  },

  getById: (id) => api.get(`/quotations/${id}`),

  create: (data) => api.post("/quotations/", data),

  update: (id, data) => api.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),

  delete: (id) => api.delete(`/quotations/${id}`),

  convertToInvoice: (id) => api.post(`/quotations/${id}/convert-to-invoice`),

  downloadPdf: (id) =>
    api.get(`/quotations/${id}/pdf`, { responseType: "blob" }),

  emailQuotation: (id, to_email = "", subject = "", message = "") =>
    api.post(`/quotations/${id}/email`, { to_email, subject, message }),
};

export default quotationService;
