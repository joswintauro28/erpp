import api from "./api";

const supplierService = {
  getAll: (): Promise<any> => api.get("/suppliers/"),
  getById: (id: any): Promise<any> => api.get(`/suppliers/${id}`),
  create: (data: any): Promise<any> => api.post("/suppliers/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/suppliers/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/suppliers/${id}`),
};

export default supplierService;
