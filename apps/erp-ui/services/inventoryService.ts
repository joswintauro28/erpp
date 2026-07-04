import api from "./api";

const inventoryService = {
  getExpiring: (days = 30): Promise<any> => api.get(`/inventory/expiring?days=${days}`),
  getBatches: (): Promise<any> => api.get("/inventory/batches"),
  createBatch: (data: any): Promise<any> => api.post("/inventory/batches", data),
  updateBatch: (id: any, data: any): Promise<any> => api.put(`/inventory/batches/${id}`, data),
  deleteBatch: (id: any): Promise<any> => api.delete(`/inventory/batches/${id}`),
  getSerials: (): Promise<any> => api.get("/inventory/serials"),
  createSerial: (data: any): Promise<any> => api.post("/inventory/serials", data),
  updateSerialStatus: (id: any, status: any): Promise<any> => api.put(`/inventory/serials/${id}/status`, { status }),
  deleteSerial: (id: any): Promise<any> => api.delete(`/inventory/serials/${id}`),
};

export default inventoryService;
