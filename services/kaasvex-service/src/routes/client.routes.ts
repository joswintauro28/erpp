import { Router } from 'express';
import { getClients, createClient, updateClient, deleteClient } from '../controllers/client.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap all client CRM routes in the authenticateTenant middleware to parse Active Tenant bounds
router.use(authenticateTenant);

router.get('/', getClients);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
