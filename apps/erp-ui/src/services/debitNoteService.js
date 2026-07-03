import api from "./api";

const debitNoteService = {
  getAll: () => api.get("/debit-notes/"),
  getById: (id) => api.get(`/debit-notes/${id}`),
  create: (data) => api.post("/debit-notes/", data),
  delete: (id) => api.delete(`/debit-notes/${id}`),
  downloadPdf: (id) => api.get(`/debit-notes/${id}/pdf`, { responseType: "blob" }),
};

export default debitNoteService;
