import { Router } from 'express';
import { 
  getTransactions, 
  createPaymentLink, 
  decryptTransactionMetadata, 
  processRefund, 
  handleGatewayWebhook 
} from '../controllers/payment.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Gateway Webhook Ingress (Publicly accessible for incoming notify webhooks and simulators)
router.post('/webhook/:gateway', handleGatewayWebhook);

// Protected routes wrapping authenticated tenant session locks
router.use(authenticateTenant);

router.get('/transactions', getTransactions);
router.post('/create-link', createPaymentLink);
router.get('/:id/decrypt', decryptTransactionMetadata);
router.post('/:id/refund', processRefund);

export default router;
