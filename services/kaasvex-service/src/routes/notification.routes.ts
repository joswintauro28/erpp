import { Router } from 'express';
import { 
  getNotificationsData, 
  updateNotificationSettings, 
  changeBroker, 
  triggerTestNotification, 
  triggerOverdueAudit 
} from '../controllers/notification.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap in authenticateTenant to ensure user and organization scopes are validated
router.use(authenticateTenant);

router.get('/', getNotificationsData);
router.post('/settings', updateNotificationSettings);
router.post('/change-broker', changeBroker);
router.post('/test', triggerTestNotification);
router.post('/trigger-overdue', triggerOverdueAudit);

export default router;
