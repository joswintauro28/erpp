import api from "./api";

export const emailService = {
  getLogs: (params = { limit: 50, skip: 0 }): Promise<any> => api.get("/email/logs", { params }),
  getLog: (id: any): Promise<any> => api.get(`/email/logs/${id}`),
};

export default emailService;
