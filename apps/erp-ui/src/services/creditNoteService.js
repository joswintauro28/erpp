import api from "./api";

const creditNoteService = {
  getAll: () => api.get("/credit-notes/"),
  getById: (id) => api.get(`/credit-notes/${id}`),
  create: (data) => api.post("/credit-notes/", data),
  delete: (id) => api.delete(`/credit-notes/${id}`),
  downloadPdf: (id) => api.get(`/credit-notes/${id}/pdf`, { responseType: "blob" }),
};

export default creditNoteService;
