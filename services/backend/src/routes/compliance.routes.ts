import { Router } from 'express';
import { 
  getTaxReport, 
  getAuditLogs, 
  finalizeInvoiceLockbox, 
  runIntegrityAudit, 
  getEInvoicePayloads 
} from '../controllers/compliance.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all compliance endpoints under authenticateTenant
router.use(authenticateTenant);

router.get('/report', getTaxReport);
router.get('/logs', getAuditLogs);
router.get('/audit', runIntegrityAudit);
router.post('/invoices/:id/finalize', finalizeInvoiceLockbox);
router.get('/invoices/:id/einvoice', getEInvoicePayloads);

export default router;
