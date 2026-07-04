import api from "./api";

const ewayBillService = {
  getAll: (): Promise<any> => api.get("/eway-bills/"),
  getById: (id: any): Promise<any> => api.get(`/eway-bills/${id}`),
  create: (data: any): Promise<any> => api.post("/eway-bills/", data),
  delete: (id: any): Promise<any> => api.delete(`/eway-bills/${id}`),
};

export default ewayBillService;
