import api from './api';

export const aiService = {
  chat: (message, conversation_id = null) => api.post("/ai/chat", { message, conversation_id }),
  getInsights: () => api.get("/ai/insights"),
  getConversations: () => api.get("/ai/conversations"),
  getConversationHistory: (id) => api.get(`/ai/conversations/${id}`)
};

export default aiService;
