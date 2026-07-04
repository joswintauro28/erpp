import api from './api';

export const aiService = {
  chat: (message: any, conversation_id: any = null): Promise<any> => api.post("/ai/chat", { message, conversation_id }),
  getInsights: (): Promise<any> => api.get("/ai/insights"),
  getConversations: (): Promise<any> => api.get("/ai/conversations"),
  getConversationHistory: (id: any): Promise<any> => api.get(`/ai/conversations/${id}`)
};

export default aiService;
