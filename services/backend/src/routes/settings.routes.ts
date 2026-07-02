import { Router } from 'express';
import {
  getSettings,
  updateOrganization,
  updateBranding,
  toggleIntegration,
  regenerateApiKey,
  getUsers,
  updateUserRole,
  deleteUser,
  changePassword,
  toggle2fa
} from '../controllers/settings.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap settings endpoints in authenticateTenant middleware for active tenant boundary protection
router.use(authenticateTenant);

router.get('/', getSettings);
router.put('/organization', updateOrganization);
router.put('/branding', updateBranding);
router.post('/integrations/:service/toggle', toggleIntegration);
router.post('/api-key/regenerate', regenerateApiKey);

router.get('/users', getUsers);
router.put('/users/:membershipId', updateUserRole);
router.delete('/users/:membershipId', deleteUser);

router.post('/security/change-password', changePassword);
router.post('/security/2fa', toggle2fa);

export default router;
