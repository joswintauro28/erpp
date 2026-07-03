import api from "./api";

const stockService = {
  getAll: () => api.get("/stock/"),
  getLowStock: () => api.get("/stock/low-stock"),
  create: (data) => api.post("/stock/", data),
};

export default stockService;
