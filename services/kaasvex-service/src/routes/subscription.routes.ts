import { Router } from 'express';
import { 
  getPlans, 
  getSubscriptions, 
  createSubscription, 
  logUsage, 
  cancelSubscription, 
  runCronSimulation 
} from '../controllers/subscription.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap all routes under authenticateTenant middleware context
router.use(authenticateTenant);

router.get('/plans', getPlans);
router.get('/', getSubscriptions);
router.post('/create', createSubscription);
router.post('/:id/usage', logUsage);
router.post('/:id/cancel', cancelSubscription);
router.post('/cron-trigger', runCronSimulation);

export default router;
