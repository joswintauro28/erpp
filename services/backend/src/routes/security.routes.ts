import { Router } from 'express';
import { 
  getSecurityData,
  updateSecurityConfig,
  rotateKmsKeys,
  anonymizeClientPII,
  exportClientPII,
  simulateExploitAttack
} from '../controllers/security.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure security actions with active organization scopes
router.use(authenticateTenant);

router.get('/', getSecurityData);
router.post('/config', updateSecurityConfig);
router.post('/kms/rotate', rotateKmsKeys);
router.post('/gdpr/anonymize', anonymizeClientPII);
router.post('/gdpr/export', exportClientPII);
router.post('/simulate-attack', simulateExploitAttack);

export default router;
