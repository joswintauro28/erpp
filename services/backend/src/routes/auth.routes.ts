import { Router } from 'express';
import { signup, login, getMe, inviteMember } from '../controllers/auth.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// 1. Authentication Handshakes (No active tenant scope required)
router.post('/signup', signup);
router.post('/login', login);

// 2. Hydrate Identity Profile Context (Requires authentication)
router.get('/me', authenticateTenant, getMe);

// 3. Invite Workspace Member (Requires active tenant validation)
router.post('/invite', authenticateTenant, inviteMember);

export default router;
