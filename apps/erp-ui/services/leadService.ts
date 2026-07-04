import api from "./api";

const buildQuery = (params: Record<string, any> = {}): string => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.append(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
};

const leadService = {
  getAll: (params = {}): Promise<any> => api.get(`/leads/${buildQuery(params)}`),
  getAnalytics: (): Promise<any> => api.get("/leads/analytics"),
  getById: (id: any): Promise<any> => api.get(`/leads/${id}`),
  create: (data: any): Promise<any> => api.post("/leads/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/leads/${id}`, data),
  convert: (id: any, data = {}): Promise<any> => api.post(`/leads/${id}/convert`, data),
  delete: (id: any): Promise<any> => api.delete(`/leads/${id}`),
};

export default leadService;
