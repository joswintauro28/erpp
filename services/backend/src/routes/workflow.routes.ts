import { Router } from 'express';
import { 
  getWorkflowsData,
  createWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  simulateWorkflowEvent
} from '../controllers/workflow.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure routes with tenant context
router.use(authenticateTenant);

router.get('/', getWorkflowsData);
router.post('/', createWorkflow);
router.post('/toggle', toggleWorkflow);
router.post('/simulate', simulateWorkflowEvent);
router.delete('/:id', deleteWorkflow);

export default router;
