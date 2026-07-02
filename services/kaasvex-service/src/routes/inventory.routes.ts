import { Router } from 'express';
import { 
  getProducts, 
  createProduct, 
  updateProduct,
  getWarehouses, 
  createWarehouse, 
  getInventoryLevels, 
  getStockMovements, 
  createStockMovement, 
  getInventoryValuation, 
  getPurchaseOrders, 
  createPurchaseOrder, 
  receivePurchaseOrder 
} from '../controllers/inventory.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all inventory routes under active organization JWT checks
router.use(authenticateTenant);

router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.get('/warehouses', getWarehouses);
router.post('/warehouses', createWarehouse);
router.get('/stock-levels', getInventoryLevels);
router.get('/movements', getStockMovements);
router.post('/movements', createStockMovement);
router.get('/valuation', getInventoryValuation);
router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', createPurchaseOrder);
router.post('/purchase-orders/:id/receive', receivePurchaseOrder);

export default router;
