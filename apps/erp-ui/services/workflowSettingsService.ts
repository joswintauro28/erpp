import api from "./api";

const workflowSettingsService = {
  getWorkflowSettings: (): Promise<any> => api.get("/workflow-settings/"),
  saveWorkflowSettings: (data: any): Promise<any> => api.post("/workflow-settings/", data),
};

export default workflowSettingsService;
