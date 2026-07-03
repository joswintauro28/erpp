import api from "./api";

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const leadService = {
  getAll: (params = {}) => api.get(`/leads/${buildQuery(params)}`),
  getAnalytics: () => api.get("/leads/analytics"),
  getById: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post("/leads/", data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  convert: (id, data = {}) => api.post(`/leads/${id}/convert`, data),
  delete: (id) => api.delete(`/leads/${id}`),
};

export default leadService;
