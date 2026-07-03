import api from "./api";

export const emailService = {
  getLogs: (params = { limit: 50, skip: 0 }) => api.get("/email/logs", { params }),
  getLog: (id) => api.get(`/email/logs/${id}`),
};

export default emailService;
