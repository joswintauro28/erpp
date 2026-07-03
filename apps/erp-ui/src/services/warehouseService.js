import api from "./api";

const warehouseService = {
  getAll: () => api.get("/warehouses/"),
  create: (data) => api.post("/warehouses/", data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  getStock: (id) => api.get(`/warehouses/${id}/stock`),
  transfer: (data) => api.post("/warehouses/transfer", data),
};

export default warehouseService;
