import { Router } from 'express';
import { 
  createInvoice, 
  getInvoices, 
  getInvoice, 
  downloadInvoice, 
  sendInvoice,
  generateEWayBill,
  updateEWayBill
} from '../controllers/invoice.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap all invoices routes in authenticateTenant to hydrate user & active workspace scope
router.use(authenticateTenant);

router.get('/', getInvoices);
router.post('/', createInvoice);
router.get('/:id', getInvoice);
router.get('/:id/download', downloadInvoice);
router.post('/:id/send', sendInvoice);
router.post('/:id/eway-bill', generateEWayBill);
router.put('/:id/eway-bill', updateEWayBill);

export default router;
