import api from "./api";

const teamService = {
  getRoles: (): Promise<any> => api.get("/team/roles"),
  getMembers: (): Promise<any> => api.get("/team/members"),
  getInvitations: (): Promise<any> => api.get("/team/invitations"),
  inviteMember: (data: any): Promise<any> => api.post("/team/invite", data),
  changeRole: (memberId: any, data: any): Promise<any> => api.put(`/team/member/${memberId}/role`, data),
  removeMember: (memberId: any): Promise<any> => api.delete(`/team/member/${memberId}`),
  revokeInvitation: (invitationId: any): Promise<any> => api.delete(`/team/invitations/${invitationId}`),
  validateInvitation: (token: string): Promise<any> => api.get(`/team/invitation/validate/${token}`),
  acceptInvitation: (data: any): Promise<any> => api.post("/team/invitation/accept", data),
};

export default teamService;
