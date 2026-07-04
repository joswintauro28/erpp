import api from "./api";

const warehouseService = {
  getAll: (): Promise<any> => api.get("/warehouses/"),
  create: (data: any): Promise<any> => api.post("/warehouses/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/warehouses/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/warehouses/${id}`),
  getStock: (id: any): Promise<any> => api.get(`/warehouses/${id}/stock`),
  transfer: (data: any): Promise<any> => api.post("/warehouses/transfer", data),
};

export default warehouseService;
