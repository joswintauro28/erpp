import { Router } from 'express';
import { 
  parseInvoice, 
  scoreLeadsBatch, 
  predictClientChurnBatch, 
  diagnoseFinancials, 
  chatRagAgent, 
  simulateWhatsAppWebhook 
} from '../controllers/ai-automation.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all endpoints under tenant boundary locks
router.use(authenticateTenant);

router.post('/invoice/parse', parseInvoice);
router.post('/crm/score-leads', scoreLeadsBatch);
router.post('/crm/predict-churn', predictClientChurnBatch);
router.get('/finance/diagnose', diagnoseFinancials);
router.post('/chat', chatRagAgent);
router.post('/whatsapp/simulate', simulateWhatsAppWebhook);

export default router;
