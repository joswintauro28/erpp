import { Router } from 'express';
import { getLeads, createLead, updateLead, deleteLead } from '../controllers/lead.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all Leads endpoints under Tenant and Authorization scope
router.use(authenticateTenant);

router.get('/', getLeads);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;
