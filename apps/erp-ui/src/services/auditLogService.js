import api from "./api";

export const auditLogService = {
  getLogs: (params = {}) => api.get("/audit-logs", { params }),
  getLog: (id) => api.get(`/audit-logs/${id}`),
};

export default auditLogService;
