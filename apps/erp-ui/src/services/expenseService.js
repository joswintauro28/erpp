import api from "./api";

export const expenseService = {
  getAll: () => api.get("/expenses/"),
  getSummary: () => api.get("/expenses/summary"),
  create: (data) => api.post("/expenses/", data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export default expenseService;
