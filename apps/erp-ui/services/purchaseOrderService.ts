import api from "./api";

const purchaseOrderService = {
  getAll: (): Promise<any> => api.get("/purchase-orders/"),
  getById: (id: any): Promise<any> => api.get(`/purchase-orders/${id}`),
  create: (data: any): Promise<any> => api.post("/purchase-orders/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/purchase-orders/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/purchase-orders/${id}`),
  receive: (id: any, data: any): Promise<any> => api.post(`/purchase-orders/${id}/receive`, data),
};

export default purchaseOrderService;
