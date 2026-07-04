import api from "./api";

const productService = {
  getAll: (): Promise<any> => api.get("/products/"),
  getById: (id: any): Promise<any> => api.get(`/products/${id}`),
  create: (data: any): Promise<any> => api.post("/products/", data),
  update: (id: any, data: any): Promise<any> => api.put(`/products/${id}`, data),
  delete: (id: any): Promise<any> => api.delete(`/products/${id}`),
};

export default productService;
