import { Router } from 'express';
import { 
  getQuotations, 
  getQuotation, 
  createQuotation, 
  acceptQuotation, 
  declineQuotation, 
  convertToInvoice 
} from '../controllers/quotation.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Wrap all quotation routes in authenticateTenant to validate sessions and inject tenant context
router.use(authenticateTenant);

router.get('/', getQuotations);
router.post('/', createQuotation);
router.get('/:id', getQuotation);
router.post('/:id/accept', acceptQuotation);
router.post('/:id/decline', declineQuotation);
router.post('/:id/convert', convertToInvoice);

export default router;
