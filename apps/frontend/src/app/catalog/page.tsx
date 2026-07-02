"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  Search, 
  ChevronDown, 
  Plus, 
  Download, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  FolderLock, 
  X,
  Zap,
  Info,
  Edit
} from 'lucide-react';

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  trackBatch: boolean;
  trackSerial: boolean;
}

interface ValuationSummary {
  totalItems: number;
  totalValuation: number;
}

export default function CatalogPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [valuation, setValuation] = useState<ValuationSummary>({ totalItems: 0, totalValuation: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Submitting
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form states
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [trackBatch, setTrackBatch] = useState(false);
  const [trackSerial, setTrackSerial] = useState(false);

  const fetchCatalogData = async () => {
    try {
      const [prodRes, valRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/inventory/valuation')
      ]);
      setProducts(prodRes.data.catalog || []);
      if (valRes.data.valuation) {
        setValuation(valRes.data.valuation);
      }
    } catch (err) {
      console.error('Failed to fetch inventory catalog:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      const hydrate = async () => {
        setLoading(true);
        await fetchCatalogData();
        setLoading(false);
      };
      hydrate();
    }
  }, [activeOrganization, authLoading]);

  const handleOpenCreateModal = () => {
    setSku('');
    setName('');
    setDescription('');
    setPrice('');
    setCost('');
    setTrackBatch(false);
    setTrackSerial(false);
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (p: ProductItem) => {
    setSku(p.sku);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(p.price.toString());
    setCost(p.cost.toString());
    setTrackBatch(p.trackBatch);
    setTrackSerial(p.trackSerial);
    setEditingProduct(p);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setSku('');
    setName('');
    setDescription('');
    setPrice('');
    setCost('');
    setTrackBatch(false);
    setTrackSerial(false);
    setEditingProduct(null);
    setShowAddModal(false);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || !price || !cost || parseFloat(price) <= 0 || parseFloat(cost) <= 0) {
      alert('Please fill in valid SKU, Name, and positive Price/Cost amounts.');
      return;
    }

    setSubmittingProduct(true);
    try {
      const payload = {
        sku: sku.toUpperCase().trim(),
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        cost: parseFloat(cost),
        trackBatch,
        trackSerial
      };

      if (editingProduct) {
        await api.put(`/inventory/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/inventory/products', payload);
      }

      setSku('');
      setName('');
      setDescription('');
      setPrice('');
      setCost('');
      setTrackBatch(false);
      setTrackSerial(false);
      setEditingProduct(null);
      setShowAddModal(false);

      await fetchCatalogData();
      alert(editingProduct 
        ? `Product SKU '${payload.sku}' updated in catalog.`
        : `Product SKU '${payload.sku}' registered in catalog. You can now issue procurement POs or record stocks!`
      );
    } catch (err: any) {
      console.error('Failed to save product:', err);
      alert(err.response?.data?.error || 'Failed to save product SKU');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Filter
  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.sku.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-8 h-8 border-3 border-gray-100 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Hydrating SKU Catalog Registers...</span>
      </div>
    );
  }

  // Circular progress SVG helper
  const drawCircleProgress = (percent: number, color: string) => {
    const radius = 20;
    const circ = 2 * Math.PI * radius;
    const strokeDashoffset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
    return (
      <svg className="w-12 h-12 transform -rotate-90 shrink-0">
        <circle cx="24" cy="24" r={radius} className="stroke-gray-100 dark:stroke-slate-800 fill-none" strokeWidth="2.5" />
        <circle 
          cx="24" 
          cy="24" 
          r={radius} 
          className="fill-none transition-all duration-500 ease-out" 
          stroke={color} 
          strokeWidth="3" 
          strokeDasharray={circ} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300 font-sans">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-800 dark:text-slate-200" />
            <span>Product SKU Registry</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-400 font-medium mt-0.5">Manage operational product models, standard sales pricing, and weighted cost valuations</p>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New SKU</span>
        </button>
      </div>

      {/* ================= INVENTORY VALUATION METRICS GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Gross Inventory Valuation */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Inventory Asset Value</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{valuation.totalValuation.toLocaleString('en-IN')}</h3>
            <span className="text-[9px] text-[#4F46E5] dark:text-indigo-400 font-extrabold block">Acquisition cost weighted</span>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            {drawCircleProgress(80, '#4F46E5')}
            <span className="absolute text-[10px] font-bold text-[#4F46E5] dark:text-indigo-400 font-mono">Cost</span>
          </div>
        </div>

        {/* KPI 2: Total Warehouse Units */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Total Physical Units</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{valuation.totalItems} Units</h3>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">Across all central depots</span>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            {drawCircleProgress(65, '#10B981')}
            <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">Qty</span>
          </div>
        </div>

        {/* KPI 3: Total catalog SKUs */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Cataloged SKUs</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{products.length} Profiles</h3>
            <span className="text-[9px] text-gray-400 dark:text-slate-500 font-bold block">Standard items registry</span>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            {drawCircleProgress(45, '#6B7280')}
            <span className="absolute text-[10px] font-bold text-gray-500 dark:text-slate-400 font-mono">SKU</span>
          </div>
        </div>

        {/* KPI 4: Operations Rating */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Procure Parity</span>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Balanced</h3>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">Asset registers synced</span>
          </div>
          <div className="relative flex items-center justify-center shrink-0">
            {drawCircleProgress(100, '#10B981')}
            <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">100%</span>
          </div>
        </div>

      </div>

      {/* ================= INTERACTIVE LIST AND FILTERS ================= */}
      <div className="space-y-4">
        
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-[#EEEEEE] dark:border-slate-800 rounded-xl">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search product code or name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F5F5F5] dark:bg-slate-800 text-xs pl-10 pr-4 py-2 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 text-gray-700 dark:text-slate-200 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium"
            />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono text-gray-400 dark:text-slate-500">Total registered profiles</span>
        </div>

        {/* Catalog Table */}
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              No products found in this organization catalog.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-slate-400 font-bold bg-[#FAFABA]/20 dark:bg-slate-800/50 tracking-wider text-[10px] uppercase">
                    <th className="p-4">SKU Identifier</th>
                    <th className="p-4">Description Label</th>
                    <th className="p-4 text-right">Standard Price</th>
                    <th className="p-4 text-right">Weighted Cost</th>
                    <th className="p-4 text-center">Batch Track</th>
                    <th className="p-4 text-center">Serial Track</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-700 dark:text-slate-300 font-medium">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white font-mono text-[10px] tracking-wider uppercase">
                        <span className="bg-zinc-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-slate-700 text-zinc-800 dark:text-slate-300">{p.sku}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-slate-200 leading-normal">{p.name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal mt-0.5 leading-relaxed">{p.description || 'No descriptive context logged'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-gray-900 dark:text-white">
                        ₹{p.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-[#4F46E5] dark:text-indigo-400">
                        ₹{p.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${p.trackBatch ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}>
                          {p.trackBatch ? 'ACTIVE' : 'OFF'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${p.trackSerial ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono' : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}>
                          {p.trackSerial ? 'ACTIVE' : 'OFF'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-slate-700 text-[10px] font-extrabold bg-zinc-50 dark:bg-slate-800 text-zinc-700 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-colors"
                        >
                          <Edit className="w-2.5 h-2.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ================= MODAL: REGISTER NEW SKU POPUP ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{editingProduct ? 'Edit SKU Product' : 'Register New Product SKU'}</h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="p-6 space-y-4 text-xs font-sans">
              
              {/* SKU & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">SKU Code *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. LAP-MAC-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-mono font-bold uppercase tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Product Label *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Apple MacBook Air"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Description context</label>
                <textarea 
                  placeholder="Memo details regarding this item..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-medium h-16 resize-none"
                />
              </div>

              {/* Cost & Selling Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Acquisition Cost (₹) *</label>
                  <input 
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Weighted cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-mono font-bold text-[#4F46E5] dark:text-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Standard Sales Price (₹) *</label>
                  <input 
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Selling price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-800 dark:focus:border-slate-700 transition-all font-mono font-bold text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Track batch & Serial checks */}
              <div className="bg-gray-50 dark:bg-slate-950/20 border border-gray-100 dark:border-slate-800 p-4 rounded-lg space-y-2">
                <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Tracking parameters</span>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-gray-700 dark:text-slate-350">
                    <input 
                      type="checkbox"
                      checked={trackBatch}
                      onChange={(e) => setTrackBatch(e.target.checked)}
                      className="w-3.5 h-3.5 accent-black dark:accent-white cursor-pointer"
                    />
                    <span>Enable Batch Tracking</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-gray-700 dark:text-slate-350">
                    <input 
                      type="checkbox"
                      checked={trackSerial}
                      onChange={(e) => setTrackSerial(e.target.checked)}
                      className="w-3.5 h-3.5 accent-black dark:accent-white cursor-pointer"
                    />
                    <span>Enable Serial Tracking</span>
                  </label>
                </div>
              </div>

              <div className="bg-[#FAFABA]/15 dark:bg-slate-950/20 border border-dashed border-[#E2E8F0] dark:border-slate-800 p-4 rounded-lg text-[10px] text-gray-400 dark:text-slate-500 italic font-semibold leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0 mt-0.5" />
                <span>Weighted inventory valuation uses the acquisition cost. Selling prices are automatically populated in sales invoices.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingProduct}
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 disabled:scale-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 flex items-center gap-1.5"
                >
                  {submittingProduct && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{editingProduct ? 'Update SKU Product' : 'Save SKU Product'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}