import api from "./api";

const settingsService = {
  getOrganization: (): Promise<any> => api.get("/settings/organization"),
  saveOrganization: (data: any): Promise<any> => api.post("/settings/organization", data),
  getBranding: (): Promise<any> => api.get("/settings/branding"),
  saveBranding: (data: any): Promise<any> => api.post("/settings/branding", data),
  getNotifications: (): Promise<any> => api.get("/settings/notifications"),
  saveNotifications: (data: any): Promise<any> => api.post("/settings/notifications", data),
  changePassword: (data: any): Promise<any> => api.put("/settings/change-password", data),
  testEmail: (): Promise<any> => api.post("/settings/test-email"),
};

export default settingsService;
