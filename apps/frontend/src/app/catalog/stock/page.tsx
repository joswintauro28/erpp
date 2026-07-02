"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  Search, 
  ChevronDown, 
  Plus, 
  Download, 
  Calendar, 
  Trash2, 
  X, 
  Check, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  ClipboardList,
  FolderSync,
  Building,
  DollarSign
} from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  cost: number;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
}

interface InventoryStock {
  id: string;
  product: Product;
  warehouse: Warehouse;
  quantity: number;
  batchNumber: string | null;
  serialNumber: string | null;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  product: Product;
  warehouse: Warehouse;
  quantity: number;
  type: string;
  batchNumber: string | null;
  serialNumber: string | null;
  reference: string | null;
  createdAt: string;
}

interface PurchaseOrderItem {
  id: string;
  product: Product;
  quantity: number;
  unitCost: number;
  amount: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierEmail: string | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: PurchaseOrderItem[];
}

export default function StockPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'levels' | 'procure' | 'audit'>('levels');
  const [loading, setLoading] = useState(true);

  // Core Data Lists
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Modals & Action Loaders
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [submittingPo, setSubmittingPo] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [submittingReceive, setSubmittingReceive] = useState(false);
  const [activePoId, setActivePoId] = useState<string | null>(null);

  // Form: Manual Adjustment
  const [adjProduct, setAdjProduct] = useState('');
  const [adjWarehouse, setAdjWarehouse] = useState('');
  const [adjQuantity, setAdjQuantity] = useState('');
  const [adjType, setAdjType] = useState('ADJUSTMENT');
  const [adjBatch, setAdjBatch] = useState('');
  const [adjSerial, setAdjSerial] = useState('');
  const [adjRef, setAdjRef] = useState('');

  // Form: Create PO
  const [poSupplierName, setPoSupplierName] = useState('');
  const [poSupplierEmail, setPoSupplierEmail] = useState('');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: string; unitCost: string }[]>([
    { productId: '', quantity: '', unitCost: '' }
  ]);

  // Form: Receive Goods
  const [recvWarehouse, setRecvWarehouse] = useState('');
  const [recvBatch, setRecvBatch] = useState('');
  const [recvSerial, setRecvSerial] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [stockRes, movementsRes, poRes, prodRes, whRes] = await Promise.all([
        api.get('/inventory/stock-levels'),
        api.get('/inventory/movements'),
        api.get('/inventory/purchase-orders'),
        api.get('/inventory/products'),
        api.get('/inventory/warehouses')
      ]);

      setStocks(stockRes.data.stocks || []);
      setMovements(movementsRes.data.movements || []);
      setPurchaseOrders(poRes.data.purchaseOrders || []);
      setProducts(prodRes.data.catalog || []);
      setWarehouses(whRes.data.warehouses || []);

      if (prodRes.data.catalog && prodRes.data.catalog.length > 0) {
        setAdjProduct(prodRes.data.catalog[0].id);
      }
      if (whRes.data.warehouses && whRes.data.warehouses.length > 0) {
        setAdjWarehouse(whRes.data.warehouses[0].id);
        setRecvWarehouse(whRes.data.warehouses[0].id);
      }
    } catch (err) {
      console.error('Failed to load inventory warehouse sheets:', err);
    }
  };

  const hydrateAll = async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      hydrateAll();
    }
  }, [activeOrganization, authLoading]);

  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct || !adjWarehouse || !adjQuantity || parseInt(adjQuantity) === 0) {
      alert('Please fill in valid products, warehouses, and non-zero quantity changes.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      const payload = {
        productId: adjProduct,
        warehouseId: adjWarehouse,
        quantity: parseInt(adjQuantity),
        type: adjType,
        batchNumber: adjBatch.trim(),
        serialNumber: adjSerial.trim(),
        reference: adjRef.trim()
      };

      await api.post('/inventory/movements', payload);

      setAdjQuantity('');
      setAdjBatch('');
      setAdjSerial('');
      setAdjRef('');
      setShowAdjustModal(false);

      await fetchData();
      alert('Inventory levels successfully adjusted and bookkept!');
    } catch (err: any) {
      console.error('Adjustment failed:', err);
      alert(err.response?.data?.error || 'Manual stock level adjustment failed.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplierName) {
      alert('Supplier name is required.');
      return;
    }

    // Verify PO items
    const validItems = poItems.filter(item => item.productId && parseInt(item.quantity) > 0 && parseFloat(item.unitCost) > 0);
    if (validItems.length === 0) {
      alert('Please select at least one valid product SKU with quantities and acquisition unit costs.');
      return;
    }

    setSubmittingPo(true);
    try {
      const payload = {
        supplierName: poSupplierName.trim(),
        supplierEmail: poSupplierEmail.trim() || undefined,
        items: validItems.map(item => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
          unitCost: parseFloat(item.unitCost)
        }))
      };

      await api.post('/inventory/purchase-orders', payload);

      setPoSupplierName('');
      setPoSupplierEmail('');
      setPoItems([{ productId: '', quantity: '', unitCost: '' }]);
      setShowPoModal(false);

      await fetchData();
      alert('Purchase Order successfully registered! Send to supplier to dispatch.');
    } catch (err: any) {
      console.error('PO creation failed:', err);
      alert(err.response?.data?.error || 'Procurement purchase order failed.');
    } finally {
      setSubmittingPo(false);
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoId || !recvWarehouse) {
      alert('PO ID and target warehouse selection are required.');
      return;
    }

    setSubmittingReceive(true);
    try {
      const payload = {
        warehouseId: recvWarehouse,
        batchNumber: recvBatch.trim() || undefined,
        serialNumber: recvSerial.trim() || undefined
      };

      await api.post(`/inventory/purchase-orders/${activePoId}/receive`, payload);

      setRecvBatch('');
      setRecvSerial('');
      setActivePoId(null);
      setShowReceiveModal(false);

      await fetchData();
      alert('Goods received! Inventory quantities updated, movements logged, and general double-entry asset balances posted.');
    } catch (err: any) {
      console.error('Receive goods failed:', err);
      alert(err.response?.data?.error || 'Receive goods failed.');
    } finally {
      setSubmittingReceive(false);
    }
  };

  const addPoItemLine = () => {
    setPoItems(prev => [...prev, { productId: '', quantity: '', unitCost: '' }]);
  };

  const removePoItemLine = (idx: number) => {
    setPoItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePoItemLine = (idx: number, key: 'productId' | 'quantity' | 'unitCost', val: string) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i === idx) {
        // Auto fill standard cost if product changes
        if (key === 'productId') {
          const selectedProd = products.find(p => p.id === val);
          return {
            ...item,
            productId: val,
            unitCost: selectedProd ? String(selectedProd.cost) : ''
          };
        }
        return { ...item, [key]: val };
      }
      return item;
    }));
  };

  // Filters based on search
  const filteredStocks = stocks.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      s.product.sku.toLowerCase().includes(q) ||
      s.product.name.toLowerCase().includes(q) ||
      s.warehouse.name.toLowerCase().includes(q) ||
      s.warehouse.code.toLowerCase().includes(q) ||
      s.batchNumber?.toLowerCase().includes(q) ||
      s.serialNumber?.toLowerCase().includes(q)
    );
  });

  const filteredMovements = movements.filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.product.sku.toLowerCase().includes(q) ||
      m.product.name.toLowerCase().includes(q) ||
      m.warehouse.name.toLowerCase().includes(q) ||
      m.warehouse.code.toLowerCase().includes(q) ||
      m.reference?.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q)
    );
  });

  const filteredPos = purchaseOrders.filter(po => {
    const q = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q) ||
      po.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300 font-sans">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-800 dark:text-slate-200" />
            <span>Depots & Warehouse Stocks</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-400 font-medium mt-0.5">Track multi-warehouse inventory levels, adjust stock parameters, and manage PO receipts</p>
        </div>

        {/* Dynamic Buttons depending on Active Tab */}
        <div className="flex items-center gap-3 w-fit shrink-0">
          <button 
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderSync className="w-3.5 h-3.5" />
            <span>Manual Adjust Stock</span>
          </button>

          <button 
            onClick={() => setShowPoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue Purchase Order</span>
          </button>
        </div>
      </div>

      {/* ================= MULTI-VIEW TABS CONTROL ================= */}
      <div className="flex items-center gap-1.5 border-b border-[#EEEEEE] dark:border-slate-800 select-none text-xs font-semibold shrink-0">
        <button
          onClick={() => { setActiveTab('levels'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'levels' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Warehouse Stock Levels
        </button>
        <button
          onClick={() => { setActiveTab('procure'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'procure' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Purchase Orders (PO)
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'audit' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Audit Movement Trail
        </button>

        {/* Global Tab Search */}
        <div className="relative ml-auto w-48 sm:w-60 mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F5] dark:bg-slate-800 text-[11px] pl-8 pr-3 py-1.5 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 text-gray-700 dark:text-slate-200 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* ================= TAB 1: STOCK LEVELS ================= */}
      {activeTab === 'levels' && (
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {filteredStocks.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              No physical stock quantities registered in databases.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold bg-[#FAFABA]/20 dark:bg-slate-850/50 tracking-wider text-[10px] uppercase">
                    <th className="p-4">SKU Code</th>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Warehouse Depot</th>
                    <th className="p-4">Batch Code</th>
                    <th className="p-4">Serial Number</th>
                    <th className="p-4 text-right">Physical Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-700 dark:text-slate-350 font-medium">
                  {filteredStocks.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white font-mono text-[9px] tracking-wider uppercase">{s.product.sku}</td>
                      <td className="p-4 font-semibold text-gray-600 dark:text-slate-300">{s.product.name}</td>
                      <td className="p-4 font-bold text-gray-700 dark:text-slate-300 font-mono text-[9px]">
                        <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">{s.warehouse.code}</span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-slate-400 font-mono text-[10px]">{s.batchNumber || '—'}</td>
                      <td className="p-4 text-gray-500 dark:text-slate-400 font-mono text-[10px]">{s.serialNumber || '—'}</td>
                      <td className="p-4 text-right">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          s.quantity > 5 ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/60'
                        }`}>
                          {s.quantity} UNITS
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PURCHASE PROCUREMENT ================= */}
      {activeTab === 'procure' && (
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {filteredPos.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              No procurement purchase orders issued in this organization context.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold bg-[#FAFABA]/20 dark:bg-slate-850/50 tracking-wider text-[10px] uppercase">
                    <th className="p-4">PO Identifier</th>
                    <th className="p-4">Supplier Agency</th>
                    <th className="p-4">Items count</th>
                    <th className="p-4 text-right">Total Outflow Value</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Procure Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-700 dark:text-slate-300 font-medium">
                  {filteredPos.map((po) => (
                    <tr key={po.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white font-mono text-[10px] tracking-wider">{po.poNumber}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-slate-200 leading-normal">{po.supplierName}</span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal mt-0.5">{po.supplierEmail || 'No supplier email logged'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-slate-400 font-bold font-mono">{po.items?.length || 0} Products</td>
                      <td className="p-4 text-right font-bold font-mono text-gray-900 dark:text-white">
                        ₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          po.status === 'RECEIVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                          po.status === 'SENT' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 animate-pulse' :
                          'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {po.status === 'SENT' ? (
                          <button
                            onClick={() => { setActivePoId(po.id); setShowReceiveModal(true); }}
                            className="text-[9px] font-extrabold text-[#4F46E5] dark:text-indigo-400 hover:bg-[#4F46E5]/10 dark:hover:bg-indigo-950/50 px-2 py-1 rounded border border-[#4F46E5]/30 dark:border-indigo-900 transition-colors"
                          >
                            Receive Goods
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-300 dark:text-slate-500">COMPLETED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: AUDIT MOVEMENT TRAIL ================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {filteredMovements.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              No stock movements logged.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold bg-[#FAFABA]/20 dark:bg-slate-850/50 tracking-wider text-[10px] uppercase">
                    <th className="p-4">SKU / Product</th>
                    <th className="p-4">Warehouse Depot</th>
                    <th className="p-4">Shift Type</th>
                    <th className="p-4">Batch / Serial</th>
                    <th className="p-4">Reference Docs</th>
                    <th className="p-4">Movement Timestamp</th>
                    <th className="p-4 text-right">Value Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-700 dark:text-slate-350 font-medium">
                  {filteredMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white font-mono text-[9px] uppercase">{m.product.sku}</span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5 leading-none">{m.product.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700 dark:text-slate-300 font-mono text-[9px]">
                        <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">{m.warehouse.code}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                          m.type === 'PURCHASE_RECEIPT' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                          m.type === 'SALES_DISPATCH' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' :
                          'bg-zinc-100 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 border border-zinc-200 dark:border-slate-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-slate-400 font-mono text-[10px]">
                        {m.batchNumber || m.serialNumber ? (
                          <div className="flex flex-col">
                            {m.batchNumber && <span>Bat: {m.batchNumber}</span>}
                            {m.serialNumber && <span>SN: {m.serialNumber}</span>}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-slate-300 font-bold font-mono">{m.reference || 'Manual Log'}</td>
                      <td className="p-4 text-gray-400 dark:text-slate-500 font-normal">{new Date(m.createdAt).toLocaleString()}</td>
                      <td className={`p-4 text-right font-extrabold font-mono ${m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} UNITS
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: MANUAL ADJUSTMENT POPUP ================= */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-600 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Manual Stock Adjustment</h3>
              </div>
              <button 
                onClick={() => setShowAdjustModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} className="p-6 space-y-4 text-xs font-sans">
              
              {/* Product and Warehouse */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Select Product *</label>
                  <div className="relative">
                    <select
                      required
                      value={adjProduct}
                      onChange={(e) => setAdjProduct(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all cursor-pointer font-semibold uppercase font-mono"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name.substring(0,15)}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Target Warehouse *</label>
                  <div className="relative">
                    <select
                      required
                      value={adjWarehouse}
                      onChange={(e) => setAdjWarehouse(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all cursor-pointer font-semibold uppercase"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.code}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Adjustment Quantity & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Quantity Change (+/-) *</label>
                  <input 
                    type="number"
                    required
                    placeholder="e.g. +10 or -5"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Movement Type *</label>
                  <div className="relative">
                    <select
                      required
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide"
                    >
                      <option value="ADJUSTMENT">Manual Adjustment</option>
                      <option value="PURCHASE_RECEIPT">Procure Receipt</option>
                      <option value="SALES_DISPATCH">Sales Dispatch</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Custom Batch and Serials */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-950/20 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Batch Code (If tracked)</label>
                  <input 
                    type="text"
                    placeholder="e.g. BAT-MAC-01"
                    value={adjBatch}
                    onChange={(e) => setAdjBatch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-gray-200 dark:focus:border-slate-600 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Serial Number (If tracked)</label>
                  <input 
                    type="text"
                    placeholder="e.g. SN-MAC-987"
                    value={adjSerial}
                    onChange={(e) => setAdjSerial(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-gray-200 dark:focus:border-slate-600 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Reference key notes</label>
                <input 
                  type="text"
                  placeholder="e.g. Warehouse relocation or damage write-off"
                  value={adjRef}
                  onChange={(e) => setAdjRef(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-semibold"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-750 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 flex items-center gap-1.5"
                >
                  {submittingAdjust && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Execute Adjustment</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ISSUE PURCHASE ORDER POPUP ================= */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-40 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-violet-600 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Issue Purchase Procurement Order</h3>
              </div>
              <button 
                onClick={() => setShowPoModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchaseOrder} className="p-6 space-y-4 text-xs font-sans overflow-y-auto flex-1 scrollbar-thin">
              
              {/* Supplier Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Supplier Agency Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. VexCorp Hardware Inc"
                    value={poSupplierName}
                    onChange={(e) => setPoSupplierName(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Supplier Contact Email</label>
                  <input 
                    type="email"
                    placeholder="e.g. sales@vexcorp.com"
                    value={poSupplierEmail}
                    onChange={(e) => setPoSupplierEmail(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Items List Dynamic Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Procurement Items</span>
                  <button 
                    type="button" 
                    onClick={addPoItemLine}
                    className="text-[9px] font-extrabold text-[#4F46E5] dark:text-indigo-400 bg-violet-50 dark:bg-indigo-950/40 hover:bg-violet-100 dark:hover:bg-indigo-950/60 px-2 py-0.5 rounded transition-all"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {poItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/20 p-3 rounded-lg border border-gray-100 dark:border-slate-800 shrink-0">
                      
                      {/* Product Selection */}
                      <div className="flex-1">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => updatePoItemLine(idx, 'productId', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-800 dark:text-slate-200 focus:outline-none focus:border-gray-300 dark:focus:border-slate-600 font-semibold font-mono"
                        >
                          <option value="">Select SKU Code</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.sku} (₹{p.cost})</option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-20">
                        <input 
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updatePoItemLine(idx, 'quantity', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-gray-800 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-slate-600 font-bold font-mono text-center"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="w-24">
                        <input 
                          type="number"
                          min="0.01"
                          step="0.01"
                          required
                          placeholder="Cost (₹)"
                          value={item.unitCost}
                          onChange={(e) => updatePoItemLine(idx, 'unitCost', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-[#4F46E5] dark:text-indigo-400 focus:outline-none focus:border-gray-300 dark:focus:border-slate-600 font-bold font-mono text-right"
                        />
                      </div>

                      {/* Delete item line */}
                      {poItems.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removePoItemLine(idx)}
                          className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-zinc-50 dark:bg-slate-950/40 border border-zinc-100 dark:border-slate-800 rounded-lg flex items-center justify-between font-mono shrink-0">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Procure Outflow Total:</span>
                <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                  ₹{poItems.reduce((sum, item) => sum + (parseInt(item.quantity || '0') * parseFloat(item.unitCost || '0')), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-750 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingPo}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 flex items-center gap-1.5"
                >
                  {submittingPo && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Issue Purchase Order</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECEIVE GOODS DIALOG ================= */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600 dark:text-emerald-450 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Procure Goods Payout & Intake</h3>
              </div>
              <button 
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReceiveGoods} className="p-6 space-y-4 text-xs font-sans">
              
              {/* Target Warehouse */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Target Warehouse Depot *</label>
                <div className="relative">
                  <select
                    required
                    value={recvWarehouse}
                    onChange={(e) => setRecvWarehouse(e.target.value)}
                    className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-slate-200 focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Batch and Serial Number Allocations */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-950/20 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Intake Batch Number</label>
                  <input 
                    type="text"
                    placeholder="Auto or Custom code"
                    value={recvBatch}
                    onChange={(e) => setRecvBatch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Intake Serial Number</label>
                  <input 
                    type="text"
                    placeholder="Auto or Custom serial"
                    value={recvSerial}
                    onChange={(e) => setRecvSerial(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:border-gray-300 dark:focus:border-slate-600 font-mono"
                  />
                </div>
              </div>

              <div className="bg-[#FAFABA]/15 dark:bg-slate-950/20 border border-dashed border-[#E2E8F0] dark:border-slate-800 p-4 rounded-lg text-[10px] text-gray-400 dark:text-slate-500 italic font-semibold leading-relaxed">
                Cohesive Double-Entry Sync Warning: Triggering intake automatically creates standard ledger items (DEBIT inventory asset stocks, CREDIT Accounts Payable liability).
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-750 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingReceive}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 flex items-center gap-1.5"
                >
                  {submittingReceive && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Process Goods Intake</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
