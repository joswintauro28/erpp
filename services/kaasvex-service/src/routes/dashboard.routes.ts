import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap dashboard endpoints to verify context headers and resolve active workspace parameters
router.get('/', authenticateTenant, getDashboardStats);

export default router;
