import api from "./api";

export const auditLogService = {
  getLogs: (params = {}): Promise<any> => api.get("/audit-logs", { params }),
  getLog: (id: any): Promise<any> => api.get(`/audit-logs/${id}`),
};

export default auditLogService;
