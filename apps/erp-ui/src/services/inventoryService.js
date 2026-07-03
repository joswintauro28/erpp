import api from "./api";

const inventoryService = {
  getExpiring: (days = 30) => api.get(`/inventory/expiring?days=${days}`),
  getBatches: () => api.get("/inventory/batches"),
  createBatch: (data) => api.post("/inventory/batches", data),
  updateBatch: (id, data) => api.put(`/inventory/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/inventory/batches/${id}`),
  getSerials: () => api.get("/inventory/serials"),
  createSerial: (data) => api.post("/inventory/serials", data),
  updateSerialStatus: (id, status) => api.put(`/inventory/serials/${id}/status`, { status }),
  deleteSerial: (id) => api.delete(`/inventory/serials/${id}`),
};

export default inventoryService;
