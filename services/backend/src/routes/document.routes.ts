import { Router } from 'express';
import { 
  getDocumentsData, 
  uploadDocument, 
  changeProvider, 
  runOcrProcessing, 
  deleteDocument 
} from '../controllers/document.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure routes with multi-tenant context parsing
router.use(authenticateTenant);

router.get('/', getDocumentsData);
router.post('/', uploadDocument);
router.post('/change-provider', changeProvider);
router.post('/:id/ocr', runOcrProcessing);
router.delete('/:id', deleteDocument);

export default router;
