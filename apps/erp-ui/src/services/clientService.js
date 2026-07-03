import api from "./api";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const clientService = {
  getAll: (paramsOrLimit = {}, skip = 0) => {
    const params = typeof paramsOrLimit === "object" ? paramsOrLimit : { limit: paramsOrLimit, skip };
    return api.get(`/clients/${buildQuery(params)}`);
  },
  search: (name) => api.get(`/clients/search?name=${encodeURIComponent(name)}`),
  getById: (id) => api.get(`/clients/${id}`),
  getInvoices: (id) => api.get(`/clients/${id}/invoices`),
  getPayments: (id) => api.get(`/clients/${id}/payments`),
  create: (data) => api.post("/clients/", data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),

  // Portal Access
  getPortalAccess: (clientId) => api.get(`/portal/access/${clientId}`),
  inviteToPortal: (clientId, email) => api.post("/portal/invite", { client_id: clientId, email }),
  resendInvitation: (clientId) => api.post("/portal/resend-invitation", { client_id: clientId }),
  revokeAccess: (clientId) => api.post("/portal/revoke", { client_id: clientId }),
  disableAccess: (clientId) => api.post("/portal/disable", { client_id: clientId }),
};

export default clientService;
