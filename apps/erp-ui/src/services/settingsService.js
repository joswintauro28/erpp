import api from "./api";

const settingsService = {
  getOrganization: () => api.get("/settings/organization"),
  saveOrganization: (data) => api.post("/settings/organization", data),
  getBranding: () => api.get("/settings/branding"),
  saveBranding: (data) => api.post("/settings/branding", data),
  getNotifications: () => api.get("/settings/notifications"),
  saveNotifications: (data) => api.post("/settings/notifications", data),
  changePassword: (data) => api.put("/settings/change-password", data),
  testEmail: () => api.post("/settings/test-email"),
};

export default settingsService;
