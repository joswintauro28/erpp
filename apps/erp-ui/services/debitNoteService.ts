import api from "./api";

const debitNoteService = {
  getAll: (): Promise<any> => api.get("/debit-notes/"),
  getById: (id: any): Promise<any> => api.get(`/debit-notes/${id}`),
  create: (data: any): Promise<any> => api.post("/debit-notes/", data),
  delete: (id: any): Promise<any> => api.delete(`/debit-notes/${id}`),
  downloadPdf: (id: any): Promise<any> => api.get(`/debit-notes/${id}/pdf`, { responseType: "blob" }),
};

export default debitNoteService;
