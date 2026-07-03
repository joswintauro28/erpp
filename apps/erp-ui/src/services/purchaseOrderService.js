import api from "./api";

const purchaseOrderService = {
  getAll: () => api.get("/purchase-orders/"),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post("/purchase-orders/", data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
  receive: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
};

export default purchaseOrderService;
