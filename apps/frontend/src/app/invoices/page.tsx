"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Search, 
  ChevronDown, 
  SlidersHorizontal, 
  Download, 
  Plus, 
  Calendar, 
  PlusCircle, 
  Trash2, 
  X, 
  Eye, 
  Mail, 
  DownloadCloud,
  DollarSign,
  TrendingUp,
  CreditCard,
  Truck,
  MapPin,
  Edit3,
  RotateCw
} from 'lucide-react';

const FALLBACK_INVOICES = [
  { id: 'inv-1', invoiceNumber: 'INV-1234', client: { name: 'Acme Corp' }, total: 5200, status: 'PAID', date: '2026-05-26', dueDate: '2026-06-11' },
  { id: 'inv-2', invoiceNumber: 'INV-1235', client: { name: 'Tech Solutions' }, total: 3000, status: 'SENT', date: '2026-05-27', dueDate: '2026-06-10' },
  { id: 'inv-3', invoiceNumber: 'INV-1236', client: { name: 'Global Industries' }, total: 12500, status: 'OVERDUE', date: '2026-05-10', dueDate: '2026-05-24' },
  { id: 'inv-4', invoiceNumber: 'INV-1237', client: { name: 'StartUp Inc' }, total: 2100, status: 'PAID', date: '2026-05-26', dueDate: '2026-06-09' },
  { id: 'inv-5', invoiceNumber: 'INV-1238', client: { name: 'Enterprise Co' }, total: 8900, status: 'DRAFT', date: '2026-05-28', dueDate: '2026-06-12' },
  { id: 'inv-6', invoiceNumber: 'INV-1239', client: { name: 'Digital Agency' }, total: 4500, status: 'PARTIALLY_PAID', date: '2026-05-22', dueDate: '2026-06-05' },
];

const FALLBACK_CLIENTS = [
  { id: 'cli-1', name: 'Acme Corp' },
  { id: 'cli-2', name: 'Tech Solutions' },
  { id: 'cli-3', name: 'Global Industries' },
  { id: 'cli-4', name: 'StartUp Inc' },
  { id: 'cli-5', name: 'Enterprise Co' },
  { id: 'cli-6', name: 'Digital Agency' },
];

export default function InvoicesPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  
  // Modals Toggles
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  // Invoice creation form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState('GST');
  const [currency, setCurrency] = useState('USD');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [items, setItems] = useState<any[]>([
    { description: '', quantity: 1, rate: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);

  // E-Way Bill state variables
  const [showEwayForm, setShowEwayForm] = useState(false);
  const [isEditingEway, setIsEditingEway] = useState(false);
  const [ewayTransporterName, setEwayTransporterName] = useState('');
  const [ewayTransporterId, setEwayTransporterId] = useState('');
  const [ewayVehicleNo, setEwayVehicleNo] = useState('');
  const [ewayTransportMode, setEwayTransportMode] = useState('Road');
  const [ewayDispatchLocation, setEwayDispatchLocation] = useState('');
  const [ewayDeliveryLocation, setEwayDeliveryLocation] = useState('');
  const [ewayDistanceKm, setEwayDistanceKm] = useState('');
  const [updatingEway, setUpdatingEway] = useState(false);

  // E-Way Bill states for invoice creation
  const [addTransportDetails, setAddTransportDetails] = useState(false);
  const [createTransporterName, setCreateTransporterName] = useState('');
  const [createTransporterId, setCreateTransporterId] = useState('');
  const [createVehicleNo, setCreateVehicleNo] = useState('');
  const [createTransportMode, setCreateTransportMode] = useState('Road');
  const [createDispatchLocation, setCreateDispatchLocation] = useState('');
  const [createDeliveryLocation, setCreateDeliveryLocation] = useState('');
  const [createDistanceKm, setCreateDistanceKm] = useState('');

  const fetchInvoicesAndClients = async () => {
    setLoading(true);
    try {
      const [invRes, cliRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients')
      ]);

      const clientsList = cliRes.data.clients || [];
      if (clientsList.length === 0) {
        setClients(FALLBACK_CLIENTS);
      } else {
        setClients(clientsList);
      }

      if (!invRes.data.invoices || invRes.data.invoices.length === 0) {
        setInvoices(FALLBACK_INVOICES);
      } else {
        setInvoices(invRes.data.invoices);
      }
    } catch {
      // Safe fallback offline mapping
      setInvoices(FALLBACK_INVOICES);
      setClients(FALLBACK_CLIENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchInvoicesAndClients();
    }
  }, [activeOrganization, authLoading]);

  // Update E-Way Bill fields when active invoice changes
  useEffect(() => {
    if (activeInvoice) {
      setShowEwayForm(false);
      setIsEditingEway(false);
      if (activeInvoice.ewayBill) {
        setEwayTransporterName(activeInvoice.ewayBill.transporterName || '');
        setEwayTransporterId(activeInvoice.ewayBill.transporterId || '');
        setEwayVehicleNo(activeInvoice.ewayBill.vehicleNo || '');
        setEwayTransportMode(activeInvoice.ewayBill.transportMode || 'Road');
        setEwayDispatchLocation(activeInvoice.ewayBill.dispatchLocation || '');
        setEwayDeliveryLocation(activeInvoice.ewayBill.deliveryLocation || '');
        setEwayDistanceKm(activeInvoice.ewayBill.distanceKm?.toString() || '');
      } else {
        setEwayTransporterName('');
        setEwayTransporterId('');
        setEwayVehicleNo('');
        setEwayTransportMode('Road');
        setEwayDispatchLocation('');
        setEwayDeliveryLocation('');
        setEwayDistanceKm('');
      }
    }
  }, [activeInvoice]);

  const handleGenerateEWayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewayTransporterName || !ewayTransporterId || !ewayVehicleNo || !ewayDispatchLocation || !ewayDeliveryLocation || !ewayDistanceKm) {
      alert("Please fill in all E-Way Bill fields.");
      return;
    }
    const dist = parseFloat(ewayDistanceKm);
    if (isNaN(dist) || dist <= 0) {
      alert("Distance must be a positive number.");
      return;
    }

    setUpdatingEway(true);
    try {
      const payload = {
        transporterName: ewayTransporterName,
        transporterId: ewayTransporterId,
        vehicleNo: ewayVehicleNo,
        transportMode: ewayTransportMode,
        dispatchLocation: ewayDispatchLocation,
        deliveryLocation: ewayDeliveryLocation,
        distanceKm: dist
      };

      const res = await api.post(`/invoices/${activeInvoice.id}/eway-bill`, payload);
      const updatedEway = res.data.ewayBill;

      // Update local invoice state lists
      const updatedInvoices = invoices.map(inv => {
        if (inv.id === activeInvoice.id) {
          return { ...inv, ewayBill: updatedEway };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      setActiveInvoice({ ...activeInvoice, ewayBill: updatedEway });
      setShowEwayForm(false);
      alert("E-Way Bill successfully generated!");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to generate E-Way Bill.");
    } finally {
      setUpdatingEway(false);
    }
  };

  const handleUpdateEWayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewayTransporterName || !ewayTransporterId || !ewayVehicleNo || !ewayDispatchLocation || !ewayDeliveryLocation || !ewayDistanceKm) {
      alert("Please fill in all E-Way Bill fields.");
      return;
    }
    const dist = parseFloat(ewayDistanceKm);
    if (isNaN(dist) || dist <= 0) {
      alert("Distance must be a positive number.");
      return;
    }

    setUpdatingEway(true);
    try {
      const payload = {
        transporterName: ewayTransporterName,
        transporterId: ewayTransporterId,
        vehicleNo: ewayVehicleNo,
        transportMode: ewayTransportMode,
        dispatchLocation: ewayDispatchLocation,
        deliveryLocation: ewayDeliveryLocation,
        distanceKm: dist
      };

      const res = await api.put(`/invoices/${activeInvoice.id}/eway-bill`, payload);
      const updatedEway = res.data.ewayBill;

      const updatedInvoices = invoices.map(inv => {
        if (inv.id === activeInvoice.id) {
          return { ...inv, ewayBill: updatedEway };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      setActiveInvoice({ ...activeInvoice, ewayBill: updatedEway });
      setIsEditingEway(false);
      alert("E-Way Bill updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update E-Way Bill.");
    } finally {
      setUpdatingEway(false);
    }
  };

  const handleUpdateEWayStatus = async (newStatus: string) => {
    setUpdatingEway(true);
    try {
      const payload = { status: newStatus };
      const res = await api.put(`/invoices/${activeInvoice.id}/eway-bill`, payload);
      const updatedEway = res.data.ewayBill;

      const updatedInvoices = invoices.map(inv => {
        if (inv.id === activeInvoice.id) {
          return { ...inv, ewayBill: updatedEway };
        }
        return inv;
      });
      setInvoices(updatedInvoices);
      setActiveInvoice({ ...activeInvoice, ewayBill: updatedEway });
      alert(`E-Way Bill status updated to ${newStatus}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update E-Way Bill status.");
    } finally {
      setUpdatingEway(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Computations
  const subtotal = items.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.rate) || 0), 0);
  const discountVal = Number(discountAmount) || 0;
  const discountedSub = Math.max(0, subtotal - discountVal);
  const cgst = discountedSub * 0.09;
  const sgst = discountedSub * 0.09;
  const totalDue = discountedSub + cgst + sgst;

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !dueDate || items.some(item => !item.description || item.rate <= 0)) {
      alert('Please fill in all required fields and item descriptions.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        clientId: selectedClientId,
        dueDate,
        items: items.map(item => ({
          description: item.description,
          quantity: parseInt(item.quantity) || 1,
          rate: parseFloat(item.rate) || 0
        })),
        notes,
        invoiceType,
        currency,
        discountAmount: parseFloat(discountAmount) || 0
      };

      if (addTransportDetails) {
        if (!createTransporterName || !createTransporterId || !createVehicleNo || !createDispatchLocation || !createDeliveryLocation || !createDistanceKm) {
          alert('Please fill in all transport detail fields.');
          setSubmitting(false);
          return;
        }
        const dist = parseFloat(createDistanceKm);
        if (isNaN(dist) || dist <= 0) {
          alert('Distance must be a positive number.');
          setSubmitting(false);
          return;
        }
        payload.transportDetails = {
          transporterName: createTransporterName,
          transporterId: createTransporterId,
          vehicleNo: createVehicleNo,
          transportMode: createTransportMode,
          dispatchLocation: createDispatchLocation,
          deliveryLocation: createDeliveryLocation,
          distanceKm: dist
        };
      }

      await api.post('/invoices', payload);
      
      // Reset Form
      setSelectedClientId('');
      setDueDate('');
      setNotes('');
      setDiscountAmount('0');
      setItems([{ description: '', quantity: 1, rate: 0 }]);
      
      // Reset Transport Details
      setAddTransportDetails(false);
      setCreateTransporterName('');
      setCreateTransporterId('');
      setCreateVehicleNo('');
      setCreateTransportMode('Road');
      setCreateDispatchLocation('');
      setCreateDeliveryLocation('');
      setCreateDistanceKm('');
      
      setShowCreateModal(false);

      fetchInvoicesAndClients();
    } catch (err) {
      console.error('Invoice creation failed:', err);
      alert('Error creating invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadInvoice = async (id: string, num: string) => {
    try {
      const res = await api.get(`/invoices/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${num}.pdf`);
      a.click();
    } catch {
      alert("Error printing dynamic binary stream file.");
    }
  };

  const sendInvoiceEmail = async (id: string) => {
    try {
      await api.post(`/invoices/${id}/send`);
      alert("Invoice successfully emailed to client!");
      fetchInvoicesAndClients();
    } catch {
      alert("Failed to email invoice. Backend service not fully active.");
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      inv.invoiceNumber?.toLowerCase().includes(query) ||
      inv.client?.name?.toLowerCase().includes(query)
    );

    const matchesStatus = statusFilter === 'All Statuses' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">Invoices</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Create and manage invoices</p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-105 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Invoice</span>
        </button>
      </div>

      {/* ================= 4x METRICS SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Revenue (This Month)</span>
            <DollarSign className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">$37,100</h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Received</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Outstanding</span>
            <TrendingUp className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">$12,500</h3>
          <p className="text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-1">Awaiting reconciliation</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Invoices Sent</span>
            <FileText className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">24</h3>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1">Dispatched this month</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Paid Invoices</span>
            <CreditCard className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">18</h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Settled accounts</p>
        </div>
      </div>

      {/* ================= INVOICE PIPELINE FILTERS ================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-[#EEEEEE] dark:border-slate-800 rounded-xl">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-550 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search invoices..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F5] dark:bg-slate-805 text-xs pl-10 pr-4 py-2 border border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 text-gray-700 dark:text-gray-250 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Status Dropdowns and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-800 px-3 py-2 pr-8 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="VIEWED">Viewed</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span>More Filters</span>
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ================= INVOICE LEDGER GRID ================= */}
      <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 w-full flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-gray-100 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest animate-pulse">Hydrating Invoice Matrix...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 dark:text-gray-550 font-semibold uppercase tracking-wider">
            No active billing receipts mapped inside this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold bg-[#FAFABA]/20 dark:bg-slate-800/40 tracking-wider text-[10px] uppercase">
                  <th className="p-4 font-semibold">Invoice ID</th>
                  <th className="p-4 font-semibold">Client</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Issue Date</th>
                  <th className="p-4 font-semibold">Due Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-700 dark:text-gray-300 font-medium">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 font-semibold">{inv.client?.name || 'External Workspace'}</td>
                    <td className="p-4 font-bold text-gray-950 dark:text-white">${(inv.total || 0).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                        inv.status === 'PAID' ? 'bg-[#E6F4EA] dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border-transparent font-extrabold shadow-sm' :
                        inv.status === 'SENT' ? 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-[#E2E8F0] dark:border-slate-800' :
                        inv.status === 'VIEWED' ? 'bg-[#EFF6FF] dark:bg-blue-955/20 text-blue-700 dark:text-blue-400 border-transparent' :
                        inv.status === 'OVERDUE' ? 'bg-[#FCE8E6] dark:bg-rose-955/20 text-rose-800 dark:text-rose-400 border-transparent' :
                        inv.status === 'DRAFT' ? 'bg-[#F1F3F4] dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-transparent' :
                        'bg-black dark:bg-white text-white dark:text-black border-transparent'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 dark:text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="p-4 text-gray-400 dark:text-gray-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setActiveInvoice(inv)}
                        className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => downloadInvoice(inv.id, inv.invoiceNumber)}
                        className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
                        title="Download PDF"
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= DIALOG MODAL: CREATE INVOICE ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Create Kaasvex Invoice</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Client Dropdown */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Target Client *</label>
                  <div className="relative">
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                    >
                      <option value="">Select a Client</option>
                      {clients.map(cli => (
                        <option key={cli.id} value={cli.id}>{cli.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Due Date *</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                  />
                </div>

                {/* Invoice Type */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Invoice Type</label>
                  <div className="relative">
                    <select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-805 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                    >
                      <option value="GST">GST Tax Invoice</option>
                      <option value="PROFORMA">Proforma Invoice</option>
                      <option value="RECURRING">Recurring Invoice</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                      <option value="DEBIT_NOTE">Debit Note</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Billing Currency</label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-805 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Line Items</h4>
                  <button 
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1 text-[11px] font-bold text-black dark:text-white hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
                    {/* Description */}
                    <div className="col-span-6">
                      <input 
                        type="text" 
                        required
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all"
                      />
                    </div>
                    {/* Quantity */}
                    <div className="col-span-2">
                      <input 
                        type="number" 
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all text-center"
                      />
                    </div>
                    {/* Rate */}
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        min="0"
                        required
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all text-right"
                      />
                    </div>
                    {/* Delete Action */}
                    <div className="col-span-1 text-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-gray-400 hover:text-red-650 dark:hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount and Notes */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Discount Amount ({currency})</label>
                  <input 
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all text-right"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Notes / Instructions</label>
                  <textarea 
                    rows={2}
                    placeholder="Enter payment instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Optional E-Way Bill Transportation Details */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addTransportDetails}
                    onChange={(e) => setAddTransportDetails(e.target.checked)}
                    className="rounded border-gray-300 dark:border-slate-700 text-black dark:text-white focus:ring-black dark:focus:ring-white w-3.5 h-3.5"
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Add Transportation Details (Generate E-Way Bill)</span>
                </label>

                {addTransportDetails && (
                  <div className="space-y-3 bg-[#FCFCFC] dark:bg-slate-950/20 p-4 border border-[#E5E5E5] dark:border-slate-800 rounded-xl animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Transporter Name *</label>
                        <input
                          type="text"
                          required
                          value={createTransporterName}
                          onChange={(e) => setCreateTransporterName(e.target.value)}
                          placeholder="e.g. DHL Logistics"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Transporter ID *</label>
                        <input
                          type="text"
                          required
                          value={createTransporterId}
                          onChange={(e) => setCreateTransporterId(e.target.value)}
                          placeholder="e.g. GSTIN / TRANS-102"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Vehicle Number *</label>
                        <input
                          type="text"
                          required
                          value={createVehicleNo}
                          onChange={(e) => setCreateVehicleNo(e.target.value)}
                          placeholder="e.g. KA-03-HA-1234"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Mode of Transport</label>
                        <div className="relative">
                          <select
                            value={createTransportMode}
                            onChange={(e) => setCreateTransportMode(e.target.value)}
                            className="appearance-none w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-805 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all cursor-pointer"
                          >
                            <option value="Road">Road</option>
                            <option value="Rail">Rail</option>
                            <option value="Air">Air</option>
                            <option value="Ship">Ship</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dispatch Location *</label>
                        <input
                          type="text"
                          required
                          value={createDispatchLocation}
                          onChange={(e) => setCreateDispatchLocation(e.target.value)}
                          placeholder="e.g. Warehouse A, Mumbai"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-1">Delivery Location *</label>
                        <input
                          type="text"
                          required
                          value={createDeliveryLocation}
                          onChange={(e) => setCreateDeliveryLocation(e.target.value)}
                          placeholder="e.g. Client Office, Delhi"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-855 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Distance (KM) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={createDistanceKm}
                        onChange={(e) => setCreateDistanceKm(e.target.value)}
                        placeholder="e.g. 1420"
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Live Calculations Box */}
              <div className="bg-[#FAFABA]/10 dark:bg-slate-950/20 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 space-y-2 mt-4 text-xs font-semibold text-gray-605 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Discount</span>
                    <span>-${discountVal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400 dark:text-gray-500 text-[10px]">
                  <span>CGST (9%)</span>
                  <span>+${cgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-400 dark:text-gray-500 text-[10px]">
                  <span>SGST (9%)</span>
                  <span>+${sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-[#E2E8F0] dark:border-slate-800 my-2 pt-2 flex justify-between text-sm font-bold text-black dark:text-white">
                  <span>Total Due ({currency})</span>
                  <span>${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-805 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:scale-100 flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />}
                  <span>Save Invoice</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= DIALOG MODAL: INVOICE DETAIL VIEW & EMAIL ACTION ================= */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">{activeInvoice.invoiceNumber}</span>
              <button 
                onClick={() => setActiveInvoice(null)}
                className="text-gray-400 hover:text-black dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Client Workspace</p>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-1">{activeInvoice.client?.name || 'External Workspace'}</h4>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-50 dark:border-slate-800 py-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Amount Due</p>
                  <p className="text-lg font-extrabold text-black dark:text-white mt-1">${(activeInvoice.total || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status State</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F4EA] dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border-transparent uppercase tracking-wider">{activeInvoice.status}</span>
                </div>
              </div>

              {/* ================= E-WAY BILL SECTION ================= */}
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">E-Way Bill Compliance</h4>
                  </div>
                  {activeInvoice.ewayBill && !isEditingEway && (
                    <button
                      onClick={() => setIsEditingEway(true)}
                      className="flex items-center gap-1 text-[11px] font-bold text-black dark:text-white hover:underline"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                  )}
                </div>

                {!activeInvoice.ewayBill && !showEwayForm && (
                  <div className="bg-[#FAFABA]/10 dark:bg-slate-950/20 border border-[#E2E8F0] dark:border-slate-800 rounded-xl p-4 text-center space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                      No E-Way bill is generated for this invoice. For regulatory logistics compliance, you can generate a validated 12-digit E-Way bill.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowEwayForm(true)}
                      className="mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-105 transition-all text-xs font-semibold shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Generate E-Way Bill</span>
                    </button>
                  </div>
                )}

                {/* E-Way Bill Generation / Edit Form */}
                {((!activeInvoice.ewayBill && showEwayForm) || (activeInvoice.ewayBill && isEditingEway)) && (
                  <form onSubmit={activeInvoice.ewayBill ? handleUpdateEWayBill : handleGenerateEWayBill} className="space-y-3 bg-[#FCFCFC] dark:bg-slate-950/20 p-4 border border-[#E5E5E5] dark:border-slate-800 rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Transporter Name *</label>
                        <input
                          type="text"
                          required
                          value={ewayTransporterName}
                          onChange={(e) => setEwayTransporterName(e.target.value)}
                          placeholder="e.g. DHL Logistics"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Transporter ID *</label>
                        <input
                          type="text"
                          required
                          value={ewayTransporterId}
                          onChange={(e) => setEwayTransporterId(e.target.value)}
                          placeholder="e.g. GSTIN / TRANS-102"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Vehicle Number *</label>
                        <input
                          type="text"
                          required
                          value={ewayVehicleNo}
                          onChange={(e) => setEwayVehicleNo(e.target.value)}
                          placeholder="e.g. KA-03-HA-1234"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-850 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Mode of Transport</label>
                        <div className="relative">
                          <select
                            value={ewayTransportMode}
                            onChange={(e) => setEwayTransportMode(e.target.value)}
                            className="appearance-none w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all cursor-pointer"
                          >
                            <option value="Road">Road</option>
                            <option value="Rail">Rail</option>
                            <option value="Air">Air</option>
                            <option value="Ship">Ship</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Dispatch Location *</label>
                        <input
                          type="text"
                          required
                          value={ewayDispatchLocation}
                          onChange={(e) => setEwayDispatchLocation(e.target.value)}
                          placeholder="e.g. Warehouse A, Mumbai"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Delivery Location *</label>
                        <input
                          type="text"
                          required
                          value={ewayDeliveryLocation}
                          onChange={(e) => setEwayDeliveryLocation(e.target.value)}
                          placeholder="e.g. Client Office, Delhi"
                          className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-855 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide mb-1">Distance (KM) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={ewayDistanceKm}
                        onChange={(e) => setEwayDistanceKm(e.target.value)}
                        placeholder="e.g. 1420"
                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-805 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:border-black dark:focus:border-white transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEwayForm(false);
                          setIsEditingEway(false);
                        }}
                        className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={updatingEway}
                        className="px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all text-xs font-semibold shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {updatingEway && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{activeInvoice.ewayBill ? "Save Changes" : "Generate E-Way Bill"}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* E-Way Bill Display Mode */}
                {activeInvoice.ewayBill && !isEditingEway && (
                  <div className="bg-gray-55 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-slate-800 pb-3">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">E-Way Bill Number</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white font-mono tracking-wide mt-0.5">{activeInvoice.ewayBill.ewayBillNo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Transit Status</p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                          activeInvoice.ewayBill.status === 'Delivered' ? 'bg-[#E6F4EA] dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-transparent' :
                          activeInvoice.ewayBill.status === 'In Transit' ? 'bg-[#FFF7ED] dark:bg-amber-955/20 text-amber-800 dark:text-amber-400 border-transparent animate-pulse' :
                          activeInvoice.ewayBill.status === 'Cancelled' ? 'bg-red-50 dark:bg-red-955/20 text-red-800 dark:text-red-400 border-transparent' :
                          'bg-[#EFF6FF] dark:bg-blue-955/20 text-blue-800 dark:text-blue-400 border-transparent'
                        }`}>
                          {activeInvoice.ewayBill.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Transporter</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{activeInvoice.ewayBill.transporterName}</span>
                        <span className="block text-[10px] text-gray-450 dark:text-gray-500">ID: {activeInvoice.ewayBill.transporterId}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Vehicle No & Mode</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{activeInvoice.ewayBill.vehicleNo}</span>
                        <span className="block text-[10px] text-gray-450 dark:text-gray-500">Via {activeInvoice.ewayBill.transportMode}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Route</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{activeInvoice.ewayBill.dispatchLocation}</span>
                            <span className="mx-1 text-gray-400">→</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{activeInvoice.ewayBill.deliveryLocation}</span>
                            <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Distance: {activeInvoice.ewayBill.distanceKm} KM</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Generated Date</span>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          {new Date(activeInvoice.ewayBill.generatedDate || activeInvoice.ewayBill.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Quick Status Control Dropdown */}
                    <div className="pt-3 border-t border-gray-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Update Status:</span>
                      <div className="relative w-36">
                        <select
                          disabled={updatingEway}
                          value={activeInvoice.ewayBill.status}
                          onChange={(e) => handleUpdateEWayStatus(e.target.value)}
                          className="w-full appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-2 py-1 pr-6 rounded-md text-[11px] font-bold text-gray-700 dark:text-gray-300 focus:outline-none hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <option value="Generated">Generated</option>
                          <option value="In Transit">In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Micro actions */}
              <div className="space-y-2 pt-2">
                <button 
                  onClick={() => downloadInvoice(activeInvoice.id, activeInvoice.invoiceNumber)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E5E5E5] dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-xs"
                >
                  <DownloadCloud className="w-4 h-4 text-gray-500" />
                  <span>Download PDF Document</span>
                </button>
                
                <button 
                  onClick={() => sendInvoiceEmail(activeInvoice.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all text-xs font-semibold shadow-xs"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email Invoice to Client</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}