import api from "./api";

const workflowSettingsService = {
  getWorkflowSettings: () => api.get("/workflow-settings/"),
  saveWorkflowSettings: (data) => api.post("/workflow-settings/", data),
};

export default workflowSettingsService;
