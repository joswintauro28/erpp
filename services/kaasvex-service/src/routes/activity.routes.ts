import { Router } from 'express';
import { getTimeline, createActivity } from '../controllers/activity.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all Activities routes under Tenant context
router.use(authenticateTenant);

router.get('/', getTimeline);
router.post('/', createActivity);

export default router;
