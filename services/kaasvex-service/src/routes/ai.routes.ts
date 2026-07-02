import { Router } from 'express';
import { 
  getAiInsights, 
  handleAiChat, 
  getChatSessions, 
  createChatSession, 
  dismissInsight 
} from '../controllers/ai.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all AI endpoints under multi-tenant organization locks
router.use(authenticateTenant);

router.get('/insights', getAiInsights);
router.post('/chat', handleAiChat);
router.get('/chat/sessions', getChatSessions);
router.post('/chat/sessions', createChatSession);
router.patch('/insights/:id/dismiss', dismissInsight);

export default router;
