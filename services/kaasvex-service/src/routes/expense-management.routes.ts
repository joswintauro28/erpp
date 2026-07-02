import { Router } from 'express';
import { 
  getClaims, 
  createClaim, 
  approveClaim, 
  reimburseClaim, 
  getCards, 
  createCard, 
  getCardTransactions, 
  matchTransaction 
} from '../controllers/expense-management.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all expense claims & card routes under active authenticateTenant
router.use(authenticateTenant);

router.get('/claims', getClaims);
router.post('/claims', createClaim);
router.post('/claims/:id/approve', approveClaim);
router.post('/claims/:id/reimburse', reimburseClaim);
router.get('/cards', getCards);
router.post('/cards', createCard);
router.get('/cards/transactions', getCardTransactions);
router.post('/cards/transactions/:id/match', matchTransaction);

export default router;
