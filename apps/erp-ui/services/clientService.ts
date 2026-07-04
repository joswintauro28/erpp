import api from "./api";

const buildQuery = (params: Record<string, any> = {}): string => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const clientService = {
  getAll: (paramsOrLimit: any = {}, skip: any = 0): Promise<any> => {
    const params = typeof paramsOrLimit === "object" ? paramsOrLimit : { limit: paramsOrLimit, skip };
    return api.get(`/clients/${buildQuery(params)}`);
  },
  search: (name: any): Promise<any> => api.get(`/clients/search?name=${encodeURIComponent(name)}`),
  getById: (id: any): Promise<any> => api.get(`/clients/${id}`),
  getInvoices: (id: any): Promise<any> => api.get(`/clients/${id}/invoices`),
  getPayments: (id: any): Promise<any> => api.get(`/clients/${id}/payments`),
  create: (data: any): Promise<any> => api.post("/clients/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/clients/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/clients/${id}`),

  // Portal Access
  getPortalAccess: (clientId: any): Promise<any> => api.get(`/portal/access/${clientId}`),
  inviteToPortal: (clientId: any, email: any): Promise<any> => api.post("/portal/invite", { client_id: clientId, email }),
  resendInvitation: (clientId: any): Promise<any> => api.post("/portal/resend-invitation", { client_id: clientId }),
  revokeAccess: (clientId: any): Promise<any> => api.post("/portal/revoke", { client_id: clientId }),
  disableAccess: (clientId: any): Promise<any> => api.post("/portal/disable", { client_id: clientId }),
};

export default clientService;
