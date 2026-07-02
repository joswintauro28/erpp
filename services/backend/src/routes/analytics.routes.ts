import { Router } from 'express';
import { 
  getFinancialAnalytics, 
  getSalesAnalytics, 
  getExecutiveAnalytics, 
  getAnalyticsExport, 
  getAnalyticsConfigs, 
  updateAnalyticsConfig 
} from '../controllers/analytics.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all reporting & analytics endpoints under organization lock
router.use(authenticateTenant);

router.get('/financial', getFinancialAnalytics);
router.get('/sales', getSalesAnalytics);
router.get('/executive', getExecutiveAnalytics);
router.get('/export/:provider', getAnalyticsExport);
router.get('/configs', getAnalyticsConfigs);
router.put('/configs', updateAnalyticsConfig);

export default router;
