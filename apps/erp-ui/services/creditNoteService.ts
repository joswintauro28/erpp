import api from "./api";

const creditNoteService = {
  getAll: (): Promise<any> => api.get("/credit-notes/"),
  getById: (id: any): Promise<any> => api.get(`/credit-notes/${id}`),
  create: (data: any): Promise<any> => api.post("/credit-notes/", data),
  delete: (id: any): Promise<any> => api.delete(`/credit-notes/${id}`),
  downloadPdf: (id: any): Promise<any> => api.get(`/credit-notes/${id}/pdf`, { responseType: "blob" }),
};

export default creditNoteService;
