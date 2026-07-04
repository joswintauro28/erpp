import api from "./api";

const buildQuery = (params: Record<string, any> = {}): string => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const invoiceService = {
  getAll: (params = {}): Promise<any> => api.get(`/invoices/${buildQuery(params)}`),
  getById: (id: any): Promise<any> => api.get(`/invoices/${id}`),
  getDetails: (id: any): Promise<any> => api.get(`/invoices/${id}/details`),
  create: (data: any): Promise<any> => api.post("/invoices/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/invoices/${id}`, data),
  updateStatus: (id: any, status: any): Promise<any> => api.put(`/invoices/${id}/status`, { status }),
  delete: (id: any): Promise<any> => api.delete(`/invoices/${id}`),
  downloadPdf: (id: any): Promise<any> => api.get(`/invoices/${id}/pdf`, { responseType: "blob" }),
  emailInvoice: (id: any, data = {}): Promise<any> => api.post(`/invoices/${id}/email`, data),
  getOverdue: (): Promise<any> => api.get("/invoices/overdue"),
  getGstSummary: (): Promise<any> => api.get("/invoices/gst-summary"),
};

export default invoiceService;
