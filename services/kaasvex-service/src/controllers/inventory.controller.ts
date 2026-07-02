import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

// Joi schemas
const productSchema = Joi.object({
  sku: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().optional().allow(''),
  price: Joi.number().positive().required(),
  cost: Joi.number().positive().required(),
  trackBatch: Joi.boolean().default(false),
  trackSerial: Joi.boolean().default(false)
});

const warehouseSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  address: Joi.string().optional().allow('')
});

const movementSchema = Joi.object({
  productId: Joi.string().required(),
  warehouseId: Joi.string().required(),
  quantity: Joi.number().integer().required(),
  type: Joi.string().valid('PURCHASE_RECEIPT', 'SALES_DISPATCH', 'ADJUSTMENT', 'TRANSFER').required(),
  batchNumber: Joi.string().optional().allow(''),
  serialNumber: Joi.string().optional().allow(''),
  reference: Joi.string().optional().allow('')
});

const purchaseOrderSchema = Joi.object({
  supplierName: Joi.string().required(),
  supplierEmail: Joi.string().email().optional().allow(''),
  items: Joi.array().items(Joi.object({
    productId: Joi.string().required(),
    quantity: Joi.number().integer().positive().required(),
    unitCost: Joi.number().positive().required()
  })).min(1).required()
});

/**
 * Dynamic Seeding and SKU catalogs
 */
export const getProducts = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Auto-seed baseline inventory items if empty
    const productCount = await prisma.product.count({ where: { organizationId } });
    if (productCount === 0) {
      const seedProducts = [
        {
          sku: 'POS-TERM-PRO',
          name: 'VexPay Handheld POS Terminal',
          description: 'Android 11 rugged handheld payment terminal with integrated slip printer.',
          price: 18500.0,
          cost: 11200.0,
          trackBatch: true,
          trackSerial: true,
          organizationId
        },
        {
          sku: 'PRN-THERM-80',
          name: 'UltraPrint 80mm Receipt Printer',
          description: 'High-speed thermal slip printer with USB & Ethernet split interfaces.',
          price: 7800.0,
          cost: 4500.0,
          trackBatch: false,
          trackSerial: true,
          organizationId
        },
        {
          sku: 'SCAN-QR-2D',
          name: 'VexScan Omni QR Barcode Scanner',
          description: 'Omnidirectional desktop hands-free 2D QR reader node.',
          price: 4900.0,
          cost: 2900.0,
          trackBatch: true,
          trackSerial: false,
          organizationId
        }
      ];

      for (const p of seedProducts) {
        await prisma.product.create({ data: p });
      }
    }

    const products = await prisma.product.findMany({
      where: { organizationId },
      orderBy: { sku: 'asc' }
    });

    res.json({ catalog: products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const organizationId = req.tenant.id;
    const existing = await prisma.product.findFirst({
      where: { organizationId, sku: value.sku }
    });

    if (existing) {
      return res.status(400).json({ error: `SKU '${value.sku}' already exists in this organization catalog` });
    }

    const product = await prisma.product.create({
      data: {
        ...value,
        organizationId
      }
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product SKU' });
  }
};

export const updateProduct = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { error, value } = productSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const organizationId = req.tenant.id;

    // Check if the product exists and belongs to this organization
    const product = await prisma.product.findFirst({
      where: { id, organizationId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product SKU profile not found' });
    }

    // Check SKU conflicts with other products in the organization catalog
    const existing = await prisma.product.findFirst({
      where: {
        organizationId,
        sku: value.sku,
        NOT: { id }
      }
    });

    if (existing) {
      return res.status(400).json({ error: `SKU '${value.sku}' already exists in this organization catalog` });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: value
    });

    res.json({ product: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product SKU' });
  }
};

/**
 * Warehouses Registry CRUD
 */
export const getWarehouses = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Auto-seed warehouses if empty
    const whCount = await prisma.warehouse.count({ where: { organizationId } });
    if (whCount === 0) {
      const seedWh = [
        {
          name: 'Bandra Central Depot',
          code: 'WH-BND',
          address: 'Block A, Bandra Kurla Complex, Mumbai, MH, 400051',
          organizationId
        },
        {
          name: 'Bengaluru East Fulfillment',
          code: 'WH-BLR',
          address: 'Plot 42, Outer Ring Road, Mahadevapura, Bengaluru, KA, 560048',
          organizationId
        }
      ];

      for (const w of seedWh) {
        await prisma.warehouse.create({ data: w });
      }
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' }
    });

    res.json({ warehouses });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWarehouse = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = warehouseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const organizationId = req.tenant.id;
    const existing = await prisma.warehouse.findFirst({
      where: { organizationId, code: value.code }
    });

    if (existing) {
      return res.status(400).json({ error: `Warehouse code '${value.code}' is already registered` });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        ...value,
        organizationId
      }
    });

    res.status(201).json({ warehouse });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({ error: 'Failed to register warehouse' });
  }
};

/**
 * Stock Levels Retrieval
 */
export const getInventoryLevels = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    const stocks = await prisma.inventory.findMany({
      where: {
        product: { organizationId }
      },
      include: {
        product: true,
        warehouse: true
      },
      orderBy: [
        { product: { sku: 'asc' } },
        { warehouse: { code: 'asc' } }
      ]
    });

    res.json({ stocks });
  } catch (error) {
    console.error('Get inventory levels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Manual Adjustments & Stock Movements
 */
export const getStockMovements = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        product: { organizationId: req.tenant.id }
      },
      include: {
        product: true,
        warehouse: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ movements });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStockMovement = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = movementSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { productId, warehouseId, quantity, type, batchNumber, serialNumber, reference } = value;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch configurations
      const product = await tx.product.findUnique({ where: { id: productId } });
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });

      if (!product || product.organizationId !== req.tenant!.id) {
        throw new Error('Product not found in this catalog context');
      }
      if (!warehouse || warehouse.organizationId !== req.tenant!.id) {
        throw new Error('Warehouse not found');
      }

      // 2. Validate serial bounds
      const normalizedSerial = product.trackSerial ? (serialNumber || null) : null;
      const normalizedBatch = product.trackBatch ? (batchNumber || null) : null;

      if (product.trackSerial && quantity !== 1 && quantity !== -1) {
        throw new Error('Serial number tracked items must be adjusted exactly 1 unit at a time');
      }

      // 3. Find target stocks
      const existingInventory = await tx.inventory.findFirst({
        where: {
          productId,
          warehouseId,
          batchNumber: normalizedBatch,
          serialNumber: normalizedSerial
        }
      });

      const currentQty = existingInventory ? existingInventory.quantity : 0;
      const finalQty = currentQty + quantity;

      if (finalQty < 0) {
        throw new Error(`Insufficient stock capacity: current units is ${currentQty}, cannot subtract ${Math.abs(quantity)}.`);
      }

      // 4. Upsert inventory level
      if (existingInventory) {
        await tx.inventory.update({
          where: { id: existingInventory.id },
          data: { quantity: finalQty }
        });
      } else {
        await tx.inventory.create({
          data: {
            productId,
            warehouseId,
            batchNumber: normalizedBatch,
            serialNumber: normalizedSerial,
            quantity: finalQty
          }
        });
      }

      // 5. Create Movement Audit Log
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          warehouseId,
          quantity,
          type,
          batchNumber: normalizedBatch,
          serialNumber: normalizedSerial,
          reference: reference || 'Manual Adjustment'
        }
      });

      return movement;
    });

    res.status(201).json({
      message: 'Stock level adjustment successfully bookkept.',
      movement: result
    });
  } catch (error: any) {
    console.error('Adjust stock error:', error);
    res.status(400).json({ error: error.message || 'Adjust stock transaction failed' });
  }
};

/**
 * Dynamic Weighted Inventory Valuation Calculator
 */
export const getInventoryValuation = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Fetch all stock levels for this tenant
    const stocks = await prisma.inventory.findMany({
      where: {
        product: { organizationId }
      },
      include: {
        product: true,
        warehouse: true
      }
    });

    let totalItems = 0;
    let totalValuation = 0;

    const warehouseMap: Record<string, { name: string; code: string; valuation: number; items: number }> = {};
    const productMap: Record<string, { sku: string; name: string; valuation: number; items: number }> = {};

    for (const item of stocks) {
      const qty = item.quantity;
      const cost = item.product.cost;
      const itemVal = qty * cost;

      totalItems += qty;
      totalValuation += itemVal;

      // Warehouse stats compilation
      if (!warehouseMap[item.warehouseId]) {
        warehouseMap[item.warehouseId] = {
          name: item.warehouse.name,
          code: item.warehouse.code,
          valuation: 0,
          items: 0
        };
      }
      warehouseMap[item.warehouseId].valuation += itemVal;
      warehouseMap[item.warehouseId].items += qty;

      // Product statistics
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          sku: item.product.sku,
          name: item.product.name,
          valuation: 0,
          items: 0
        };
      }
      productMap[item.productId].valuation += itemVal;
      productMap[item.productId].items += qty;
    }

    res.json({
      valuation: {
        totalItems,
        totalValuation,
        warehouses: Object.values(warehouseMap),
        products: Object.values(productMap)
      }
    });
  } catch (error) {
    console.error('Get inventory valuation error:', error);
    res.status(500).json({ error: 'Valuation calculation engines failed' });
  }
};

/**
 * Purchase Procurement Orders CRUD
 */
export const getPurchaseOrders = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { organizationId: req.tenant.id },
      include: {
        items: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ purchaseOrders: pos });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPurchaseOrder = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { error, value } = purchaseOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { supplierName, supplierEmail, items } = value;
    const organizationId = req.tenant.id;

    // Generate unique PO sequence number
    const count = await prisma.purchaseOrder.count({ where: { organizationId } });
    const poNumber = `PO-${new Date().toISOString().slice(0,7).replace('-','')}-${String(count + 1).padStart(4, '0')}`;

    const totalAmount = items.reduce((sum: number, it: any) => sum + (it.quantity * it.unitCost), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        organizationId,
        poNumber,
        supplierName,
        supplierEmail,
        totalAmount,
        status: 'SENT', // Default to sent since order is issued
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitCost,
            amount: it.quantity * it.unitCost
          }))
        }
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    res.status(201).json({ purchaseOrder: po });
  } catch (error) {
    console.error('Create PO error:', error);
    res.status(500).json({ error: 'Failed to issue Purchase Order procurement' });
  }
};

/**
 * Receiving Goods from Purchase Orders (Auto-accounting integrated)
 */
export const receivePurchaseOrder = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const { id } = req.params;
    const { warehouseId, batchNumber, serialNumber } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Target Warehouse is required to receive goods' });
    }

    const organizationId = req.tenant.id;

    const result = await prisma.$transaction(async (tx) => {
      // A. Fetch PO
      const po = await tx.purchaseOrder.findFirst({
        where: { id, organizationId },
        include: { items: { include: { product: true } } }
      });

      if (!po) throw new Error('Purchase Order not found');
      if (po.status === 'RECEIVED') throw new Error('Purchase Order has already been received');

      // Validate target warehouse
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId } });
      if (!warehouse || warehouse.organizationId !== organizationId) {
        throw new Error('Target warehouse not found');
      }

      // B. Hydrate Stock levels for each item
      for (const item of po.items) {
        const prod = item.product;

        const normalizedBatch = prod.trackBatch ? (batchNumber || `BAT-${po.poNumber}`) : null;
        const normalizedSerial = prod.trackSerial ? (serialNumber || `SN-${po.poNumber}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`) : null;

        // Find or create Inventory
        const inv = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId,
            batchNumber: normalizedBatch,
            serialNumber: normalizedSerial
          }
        });

        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: inv.quantity + item.quantity }
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              warehouseId,
              quantity: item.quantity,
              batchNumber: normalizedBatch,
              serialNumber: normalizedSerial
            }
          });
        }

        // Create Stock Movement log
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            warehouseId,
            quantity: item.quantity,
            type: 'PURCHASE_RECEIPT',
            batchNumber: normalizedBatch,
            serialNumber: normalizedSerial,
            reference: po.poNumber
          }
        });
      }

      // C. Transition PO state to RECEIVED
      const updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: { items: { include: { product: true } } }
      });

      // D. Cohesive Double-Entry Ledger Bookkeeping Integration (Module 8 integration)
      // Check if accounts like Cash (1010), AP (2000), and Inventory Assets (1300) exist
      const accounts = await tx.account.findMany({ where: { organizationId } });
      let inventoryAcc = accounts.find(a => a.code === '1300');
      let apAcc = accounts.find(a => a.code === '2000');

      if (!inventoryAcc) {
        // Create an Inventory Asset account if missing
        inventoryAcc = await tx.account.create({
          data: {
            name: 'Inventory Stocks',
            code: '1300',
            type: 'ASSET',
            balance: 0.0,
            organizationId
          }
        });
      }

      if (inventoryAcc && apAcc) {
        // Post double-entry journal entry
        await tx.journalEntry.create({
          data: {
            organizationId,
            description: `Auto-Bookkeeping: Received goods from ${po.supplierName} - ${po.poNumber}`,
            reference: po.poNumber,
            lines: {
              create: [
                { accountId: inventoryAcc.id, type: 'DEBIT', amount: po.totalAmount }, // Debiting Assets increases stock value
                { accountId: apAcc.id, type: 'CREDIT', amount: po.totalAmount }       // Crediting Liabilities increases AP payable
              ]
            }
          }
        });

        // Reconcile ledger balances
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: po.totalAmount } }
        });

        await tx.account.update({
          where: { id: apAcc.id },
          data: { balance: { increment: po.totalAmount } }
        });
      }

      // Log system timeline activity
      await tx.activity.create({
        data: {
          organizationId,
          type: 'System',
          description: `Received goods for ${po.poNumber} at ${warehouse.name} (Value: ₹${po.totalAmount.toLocaleString('en-IN')}). General ledger updated.`
        }
      });

      return updatedPo;
    });

    res.json({
      message: 'Goods received, inventory records updated, and general ledger double-entries posted.',
      purchaseOrder: result
    });
  } catch (error: any) {
    console.error('Receive goods error:', error);
    res.status(400).json({ error: error.message || 'Receive goods transaction failed' });
  }
};
