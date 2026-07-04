import api from "./api";

export const quotationService = {
  getAll: (limit = 100, skip = 0, search = "", status = ""): Promise<any> => {
    const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    return api.get(`/quotations/?${params.toString()}`);
  },

  getById: (id: any): Promise<any> => api.get(`/quotations/${id}`),

  create: (data: any): Promise<any> => api.post("/quotations/", data),

  update: (id: any, data: any): Promise<any> => api.put(`/quotations/${id}`, data),
  updateStatus: (id: any, status: any): Promise<any> => api.patch(`/quotations/${id}/status`, { status }),

  delete: (id: any): Promise<any> => api.delete(`/quotations/${id}`),

  convertToInvoice: (id: any): Promise<any> => api.post(`/quotations/${id}/convert-to-invoice`),

  downloadPdf: (id: any): Promise<any> =>
    api.get(`/quotations/${id}/pdf`, { responseType: "blob" }),

  emailQuotation: (id: any, to_email = "", subject = "", message = ""): Promise<any> =>
    api.post(`/quotations/${id}/email`, { to_email, subject, message }),
};

export default quotationService;
