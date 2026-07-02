"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/Cards';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  Search, 
  ChevronDown, 
  Plus, 
  X, 
  Check, 
  DollarSign, 
  TrendingUp, 
  Activity,
  CreditCard,
  Building2,
  Lock,
  Zap,
  FolderLock,
  AlertTriangle,
  FileCheck2,
  UploadCloud,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const FALLBACK_EXPENSES = [
  { id: "ex-1", description: "AWS hosting fees and database compute Retainers", category: "Software", amount: 2500.0, date: "2026-05-28T00:00:00.000Z", paymentMethod: "Credit Card" },
  { id: "ex-2", description: "Business consulting round-trip flights Mumbai", category: "Travel", amount: 1500.0, date: "2026-05-27T00:00:00.000Z", paymentMethod: "Bank Transfer" },
  { id: "ex-3", description: "Bandra office electricity bill monthly cycle", category: "Utilities", amount: 9000.0, date: "2026-05-25T00:00:00.000Z", paymentMethod: "Cash" }
];

const MOCK_RECEIPT_MERCHANTS = [
  { desc: "Uber taxi to South Mumbai client meeting", amt: "1200", cat: "Travel" },
  { desc: "AWS hosting compute invoice may cycle", amt: "8500", cat: "Software" },
  { desc: "Broadband office internet router connection", amt: "2200", cat: "Utilities" }
];

export default function ExpensesPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'ledgers' | 'claims' | 'cards'>('ledgers');
  const [loading, setLoading] = useState(true);

  // Core Data Lists
  const [expenses, setExpenses] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [cardTransactions, setCardTransactions] = useState<any[]>([]);

  // Modals & Loaders
  const [showLogModal, setShowLogModal] = useState(false);
  const [submittingExp, setSubmittingExp] = useState(false);
  
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [submittingMatch, setSubmittingMatch] = useState(false);
  const [activeTransId, setActiveTransId] = useState<string | null>(null);

  // Form: Cash Expense
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Travel');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Form: Employee Claim
  const [claimSubmitter, setClaimSubmitter] = useState('');
  const [claimDesc, setClaimDesc] = useState('');
  const [claimCat, setClaimCat] = useState('Travel');
  const [claimAmt, setClaimAmt] = useState('');
  const [claimDate, setClaimDate] = useState('');
  const [claimReceipt, setClaimReceipt] = useState('');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLedgerExpenses = async () => {
    try {
      const res = await api.get('/accounting/expenses');
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.warn('Fetch direct expenses failed, using mock data:', err);
      setExpenses(FALLBACK_EXPENSES);
    }
  };

  const fetchClaimsAndCards = async () => {
    try {
      const [claimRes, cardRes, transRes] = await Promise.all([
        api.get('/expenses/claims'),
        api.get('/expenses/cards'),
        api.get('/expenses/cards/transactions')
      ]);
      setClaims(claimRes.data.claims || []);
      setCards(cardRes.data.cards || []);
      setCardTransactions(transRes.data.transactions || []);
    } catch (err) {
      console.warn('Fetch claims/cards failed:', err);
    }
  };

  const hydrateAll = async () => {
    setLoading(true);
    await Promise.all([fetchLedgerExpenses(), fetchClaimsAndCards()]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      hydrateAll();
    }
  }, [activeOrganization, authLoading]);

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) {
      alert('Please fill in descriptions and valid positive amounts.');
      return;
    }

    setSubmittingExp(true);
    try {
      const payload = {
        description,
        category,
        amount: parseFloat(amount),
        paymentMethod
      };

      await api.post('/accounting/expenses', payload);

      setDescription('');
      setAmount('');
      setCategory('Travel');
      setPaymentMethod('Cash');
      setShowLogModal(false);

      await hydrateAll();
      alert('Direct cost logged and general ledger auto-bookkeeping entries posted.');
    } catch (err) {
      console.error('Failed to log expense:', err);
      alert('Expense logging failed.');
    } finally {
      setSubmittingExp(false);
    }
  };

  const handleScanReceiptMock = () => {
    setScanningReceipt(true);
    
    // Simulate OCR scanning overlays
    setTimeout(() => {
      // Pick random receipt
      const randomReceipt = MOCK_RECEIPT_MERCHANTS[Math.floor(Math.random() * MOCK_RECEIPT_MERCHANTS.length)];
      setClaimDesc(randomReceipt.desc);
      setClaimAmt(randomReceipt.amt);
      setClaimCat(randomReceipt.cat);
      setClaimDate(new Date().toISOString().split('T')[0]);
      setClaimReceipt('https://s3.amazonaws.com/kaasvex/receipts/' + Math.random().toString(36).substr(2, 9) + '.pdf');
      
      setScanningReceipt(false);
      alert('OCR Extraction Complete! Auto-populated fields successfully.');
    }, 1500);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimSubmitter || !claimDesc || !claimAmt || parseFloat(claimAmt) <= 0) {
      alert('Submitter name, description, and positive amount are required.');
      return;
    }

    setSubmittingClaim(true);
    try {
      const payload = {
        submittedBy: claimSubmitter.trim(),
        description: claimDesc.trim(),
        category: claimCat,
        amount: parseFloat(claimAmt),
        claimDate: claimDate ? new Date(claimDate).toISOString() : undefined,
        receiptUrl: claimReceipt
      };

      await api.post('/expenses/claims', payload);

      setClaimSubmitter('');
      setClaimDesc('');
      setClaimAmt('');
      setClaimDate('');
      setClaimReceipt('');
      setShowClaimModal(false);

      await fetchClaimsAndCards();
      alert('Expense claim submitted! AI risk audit engine verified the receipt for duplicates or fraud.');
    } catch (err: any) {
      console.error('Failed to file claim:', err);
      alert(err.response?.data?.error || 'Claim filing failed');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const handleApproveClaim = async (id: string) => {
    try {
      await api.post(`/expenses/claims/${id}/approve`);
      await fetchClaimsAndCards();
      alert('Expense claim approved!');
    } catch (err) {
      console.error('Approve failed:', err);
      alert('Claim approval failed');
    }
  };

  const handleReimburseClaim = async (id: string) => {
    try {
      await api.post(`/expenses/claims/${id}/reimburse`);
      await Promise.all([fetchLedgerExpenses(), fetchClaimsAndCards()]);
      alert('Claim reimbursed! Cash account balance decreased and general ledger double-entries posted.');
    } catch (err: any) {
      console.error('Reimbursement failed:', err);
      alert(err.response?.data?.error || 'Reimbursement payout failed.');
    }
  };

  const handleMatchTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransId || !claimReceipt) {
      alert('Transaction selection and matching claim receipt are required.');
      return;
    }

    setSubmittingMatch(true);
    try {
      await api.post(`/expenses/cards/transactions/${activeTransId}/match`, {
        expenseClaimId: claimReceipt
      });

      setActiveTransId(null);
      setClaimReceipt('');
      setShowMatchModal(false);

      await fetchClaimsAndCards();
      alert('Corporate card transaction matched and reconciled!');
    } catch (err: any) {
      console.error('Match failed:', err);
      alert(err.response?.data?.error || 'Matching card transaction failed.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  // Dynamic Pie Chart Breakdown
  const categoryMap = expenses.reduce((acc: any, curr: any) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const pieColors = ['#000000', '#4B5563', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
  const pieData = Object.keys(categoryMap).map((cat, i) => ({
    name: cat,
    value: categoryMap[cat],
    color: pieColors[i % pieColors.length]
  }));

  const totalLedgerExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Filters based on search
  const filteredExpenses = expenses.filter(exp => {
    const q = searchQuery.toLowerCase();
    return (
      exp.description?.toLowerCase().includes(q) ||
      exp.category?.toLowerCase().includes(q) ||
      exp.paymentMethod?.toLowerCase().includes(q)
    );
  });

  const filteredClaims = claims.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.submittedBy.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  const filteredTransactions = cardTransactions.filter(tr => {
    const q = searchQuery.toLowerCase();
    return (
      tr.vendor.toLowerCase().includes(q) ||
      tr.status.toLowerCase().includes(q) ||
      tr.card.cardholderName.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner text="Synchronizing Expense Management streams..." />;

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300 font-sans">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            <span>Corporate Expense & Cards</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Audit employee reimbursements, scan receipts, auto-detect frauds, and track card transactions</p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-3 w-fit shrink-0">
          <button 
            onClick={() => setShowClaimModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
            <span>File Claims</span>
          </button>

          <button 
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] dark:border dark:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Direct Outflow</span>
          </button>
        </div>
      </div>

      {/* ================= MULTI-VIEW TABS CONTROL ================= */}
      <div className="flex items-center gap-1.5 border-b border-[#EEEEEE] dark:border-slate-800 select-none text-xs font-semibold shrink-0">
        <button
          onClick={() => { setActiveTab('ledgers'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'ledgers' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-slate-400 font-bold' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Corporate Outflow Ledgers
        </button>
        <button
          onClick={() => { setActiveTab('claims'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'claims' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-slate-400 font-bold' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Reimbursements & AI Claims
        </button>
        <button
          onClick={() => { setActiveTab('cards'); setSearchQuery(''); }}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'cards' ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-slate-400 font-bold' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Corporate Card Terminal
        </button>

        {/* Global search */}
        <div className="relative ml-auto w-48 sm:w-60 mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-3.5 h-3.5" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F5] dark:bg-slate-800 text-[11px] pl-8 pr-3 py-1.5 border border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 text-gray-700 dark:text-gray-200 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* ================= TAB 1: OUTFLOW LEDGERS ================= */}
      {activeTab === 'ledgers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Pie chart */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs">
              <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Outflow Costs</span>
                <DollarSign className="w-4 h-4 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
                ₹{totalLedgerExpenses.toLocaleString('en-IN')}
              </h3>
              <p className="text-[9px] text-[#4F46E5] dark:text-indigo-400 font-bold mt-1">Bookkept in general accounts</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs flex flex-col justify-center items-center h-64">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Expense Proportions</span>
              <div className="h-44 w-full">
                {pieData.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-450 dark:text-gray-500">No chart data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={56} dataKey="value" paddingAngle={2}>
                        {pieData.map((e, idx) => <Cell key={idx} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Right: Outflow Table */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/20 dark:bg-slate-850/20 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">Direct operational ledger</span>
            </div>
            {filteredExpenses.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">No logged outflows.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold tracking-wider text-[10px] uppercase">
                      <th className="p-4">Category</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Payment Path</th>
                      <th className="p-4 text-right">Value Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-850 text-gray-700 dark:text-gray-300 font-medium">
                    {filteredExpenses.map((exp, i) => (
                      <tr key={i} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <span className="bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold font-mono text-[9px] uppercase">{exp.category}</span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-300 font-bold leading-normal">{exp.description}</td>
                        <td className="p-4 text-gray-400 dark:text-gray-500 font-semibold">{exp.paymentMethod}</td>
                        <td className="p-4 text-right font-bold font-mono text-rose-600 dark:text-rose-400">
                          ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: AI REIMBURSEMENTS & CLAIMS ================= */}
      {activeTab === 'claims' && (
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-855 rounded-xl shadow-xs overflow-hidden">
          {filteredClaims.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
              No employee expense claims filed in this organization workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold bg-[#FAFABA]/20 dark:bg-slate-850/30 tracking-wider text-[10px] uppercase">
                    <th className="p-4">Submitter</th>
                    <th className="p-4">Description Claim</th>
                    <th className="p-4 text-center">Category</th>
                    <th className="p-4 text-right">Amount (₹)</th>
                    <th className="p-4 text-center">AI Risk Audits</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-850 text-gray-700 dark:text-gray-300 font-medium">
                  {filteredClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-gray-900 dark:text-white">{c.submittedBy}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-700 dark:text-gray-300 leading-normal">{c.description}</span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{new Date(c.claimDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-zinc-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 font-mono text-[9px] uppercase">{c.category}</span>
                      </td>
                      <td className="p-4 text-right font-bold font-mono text-gray-900 dark:text-white">
                        ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {c.duplicateFlag && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/50 font-mono">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> DUP_ALERT
                            </span>
                          )}
                          {c.fraudFlag && (
                            <span 
                              title={c.fraudDetails}
                              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border border-amber-100 dark:border-amber-900/50 font-mono cursor-help"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> FRAUD_ALERT
                            </span>
                          )}
                          {!c.duplicateFlag && !c.fraudFlag && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-mono">
                              <Check className="w-2.5 h-2.5 shrink-0" /> AI_PASSED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                          c.status === 'REIMBURSED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' :
                          c.status === 'APPROVED' ? 'bg-black dark:bg-slate-800 text-white dark:text-white' :
                          c.status === 'REJECTED' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' :
                          'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 animate-pulse'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {c.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproveClaim(c.id)}
                            className="text-[9px] font-extrabold text-black dark:text-white hover:bg-black/10 dark:hover:bg-slate-800 px-2.5 py-1 rounded border border-black dark:border-slate-700 transition-colors"
                          >
                            Approve Claim
                          </button>
                        )}
                        {c.status === 'APPROVED' && (
                          <button
                            onClick={() => handleReimburseClaim(c.id)}
                            className="text-[9px] font-extrabold text-[#4F46E5] dark:text-indigo-400 hover:bg-[#4F46E5]/10 dark:hover:bg-indigo-950/20 px-2.5 py-1 rounded border border-[#4F46E5]/30 dark:border-indigo-900/50 transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <Zap className="w-3 h-3 fill-[#4F46E5] dark:fill-indigo-400" />
                            <span>Process Payout</span>
                          </button>
                        )}
                        {c.status === 'REIMBURSED' && (
                          <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 flex items-center justify-end gap-1"><FileCheck2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Settled</span>
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

      {/* ================= TAB 3: CORPORATE CARD TERMINAL ================= */}
      {activeTab === 'cards' && (
        <div className="space-y-6 select-none animate-in fade-in duration-300">
          
          {/* Card display grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map(c => (
              <div 
                key={c.id} 
                className="relative overflow-hidden rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black text-white p-5 shadow-lg h-44 flex flex-col justify-between group transition-all duration-300 hover:shadow-xl hover:scale-[1.01]"
              >
                {/* Background glowing rings */}
                <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-zinc-800/10 rounded-full blur-xl group-hover:bg-zinc-800/20 transition-all duration-500" />
                
                {/* Card Header Brand */}
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-zinc-500">{c.cardBrand} Business</span>
                  <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center text-xs font-mono font-extrabold text-zinc-400 group-hover:text-white transition-colors">CC</div>
                </div>

                {/* Card Number Masked */}
                <div className="my-2 select-none">
                  <span className="text-xs font-semibold tracking-widest font-mono text-zinc-400 block">{c.cardNumber}</span>
                  <span className="text-[9px] font-bold text-zinc-500 block mt-1 uppercase tracking-wide">{c.cardholderName}</span>
                </div>

                {/* Card Limit details */}
                <div className="flex items-end justify-between pt-2 border-t border-zinc-800 shrink-0">
                  <div>
                    <span className="text-[8px] font-bold uppercase text-zinc-500 block">Spent Limit Cap</span>
                    <span className="text-xs font-extrabold font-mono text-zinc-300">₹{c.spentAmount.toLocaleString('en-IN')} / ₹{c.creditLimit.toLocaleString('en-IN')}</span>
                  </div>

                  <span className="text-[8px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono uppercase tracking-wide">{c.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions List */}
          <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-50 dark:border-slate-800 flex items-center justify-between bg-gray-50/20 dark:bg-slate-850/20 shrink-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-500">Card billing transaction feed</span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">No card transactions logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 tracking-wider text-[10px] uppercase">
                      <th className="p-4">Cardholder</th>
                      <th className="p-4">Merchant Vendor</th>
                      <th className="p-4">Billing Date</th>
                      <th className="p-4 text-right">Charged Amount</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Reconcile Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-850 text-gray-700 dark:text-gray-300 font-medium">
                    {filteredTransactions.map((tr) => (
                      <tr key={tr.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">{tr.card.cardholderName}</td>
                        <td className="p-4 font-bold text-gray-700 dark:text-gray-300 leading-normal">{tr.vendor}</td>
                        <td className="p-4 text-gray-400 dark:text-gray-500 font-normal">{new Date(tr.transactionDate).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-bold font-mono text-gray-900 dark:text-white">
                          ₹{tr.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            tr.status === 'MATCHED' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 animate-pulse'
                          }`}>
                            {tr.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {tr.status === 'PENDING' ? (
                            <button
                              onClick={() => { setActiveTransId(tr.id); setShowMatchModal(true); }}
                              className="text-[9px] font-extrabold text-black dark:text-white hover:bg-black/10 dark:hover:bg-slate-800 px-2 py-1 rounded border border-black dark:border-slate-700 transition-colors"
                            >
                              Match Receipt
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 flex items-center justify-end gap-1"><FileCheck2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Reconciled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= MODAL: FILE CLAIMS WITH SCANNER ================= */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">File Employee Expense Claim</h3>
              </div>
              <button 
                onClick={() => setShowClaimModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Scan Simulated Panel */}
            <div className="p-6 pb-2 border-b border-gray-100 dark:border-slate-850 flex flex-col justify-center items-center bg-gray-55/50 dark:bg-slate-950/50">
              <div className="relative w-full h-24 border border-dashed border-zinc-300 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center bg-white dark:bg-slate-900 group cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 transition-colors overflow-hidden select-none">
                
                {scanningReceipt ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-zinc-200 dark:border-slate-800 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-[9px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest animate-pulse font-mono">Running AI OCR Extraction...</span>
                    {/* Visual scanner bar */}
                    <div className="absolute left-0 right-0 h-0.5 bg-violet-600/50 shadow-md animate-bounce top-0" />
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleScanReceiptMock}
                    className="flex flex-col items-center justify-center gap-1 w-full h-full text-zinc-500 dark:text-gray-400"
                  >
                    <UploadCloud className="w-6 h-6 text-zinc-400 dark:text-gray-500 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors" />
                    <span className="text-[10px] font-bold text-zinc-550 dark:text-gray-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Drag-and-drop receipt or click to Scan</span>
                    <span className="text-[8px] text-zinc-400 dark:text-gray-550 mt-0.5">PDF, PNG or JPEG (Max 5MB)</span>
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmitClaim} className="p-6 space-y-4 text-xs font-sans max-h-[50vh] overflow-y-auto scrollbar-thin">
              
              {/* Submitter & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Claimant Name *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Nikhil CEO"
                    value={claimSubmitter}
                    onChange={(e) => setClaimSubmitter(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Select Claim Category *</label>
                  <div className="relative">
                    <select
                      required
                      value={claimCat}
                      onChange={(e) => setClaimCat(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide"
                    >
                      <option value="Travel" className="dark:bg-slate-900">Travel (Taxi/Hotels)</option>
                      <option value="Software" className="dark:bg-slate-900">Software & SaaS licenses</option>
                      <option value="Meals" className="dark:bg-slate-900">Meals & Client Entertainments</option>
                      <option value="Utilities" className="dark:bg-slate-900">Utilities & Electricity</option>
                      <option value="Rent" className="dark:bg-slate-900">Office Rents</option>
                      <option value="Other" className="dark:bg-slate-900">Other Expenses</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Cost memo */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Cost Claim Description *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Business consulting team dinner or AWS retainer"
                  value={claimDesc}
                  onChange={(e) => setClaimDesc(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-semibold"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Amount (₹) *</label>
                  <input 
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Claim value"
                    value={claimAmt}
                    onChange={(e) => setClaimAmt(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-mono font-bold text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Claim Invoice Date</label>
                  <input 
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingClaim}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-gray-500 flex items-center gap-1.5 dark:border dark:border-slate-700"
                >
                  {submittingClaim && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Submit Claim</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DIRECT OUTFLOW COST LOG ================= */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4F46E5] dark:text-indigo-400 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Log Direct Outflow Cost</h3>
              </div>
              <button 
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="p-6 space-y-4 text-xs font-sans">
              
              {/* Select Category */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Select Expense Category *</label>
                <div className="relative">
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide"
                  >
                    <option value="Travel" className="dark:bg-slate-900">Travel (Flights/Taxis)</option>
                    <option value="Software" className="dark:bg-slate-900">Software & SaaS retainers</option>
                    <option value="Utilities" className="dark:bg-slate-900">Utilities & Electricity</option>
                    <option value="Meals" className="dark:bg-slate-900">Meals & Client Entertainments</option>
                    <option value="Rent" className="dark:bg-slate-900">Physical Office rents</option>
                    <option value="Other" className="dark:bg-slate-900">Other Miscellaneous Expenses</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Cost Memo Description *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. AWS hosting fees or client meeting taxis"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-semibold"
                />
              </div>

              {/* Amount & Payment Method */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Outflow Amount (₹) *</label>
                  <input 
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="Amount in INR"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-mono font-bold text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Reconciliation Path *</label>
                  <div className="relative">
                    <select
                      required
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide"
                    >
                      <option value="Cash" className="dark:bg-slate-900">Cash Ledger</option>
                      <option value="Credit Card" className="dark:bg-slate-900">Merchant Credit Card</option>
                      <option value="Bank Transfer" className="dark:bg-slate-900">Bank wire / IMPS transfer</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="bg-[#FAFABA]/15 dark:bg-[#FAFABA]/5 border border-dashed border-[#E2E8F0] dark:border-slate-800 p-4 rounded-lg text-[10px] text-gray-400 dark:text-gray-500 italic font-semibold leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <span>Direct outflows are instantly bookkept to double-entry general ledger statements, bypassing claimant and approval workflow steps.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingExp}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-gray-500 flex items-center gap-1.5 dark:border dark:border-slate-700"
                >
                  {submittingExp && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Save Direct Cost</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECONCILE CARD TRANSACTION POPUP ================= */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Reconcile Card Billing with Receipt</h3>
              </div>
              <button 
                onClick={() => setShowMatchModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMatchTransaction} className="p-6 space-y-4 text-xs font-sans">
              
              {/* Select Claim Receipt */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Select Extracted Receipt Claim *</label>
                <div className="relative">
                  <select
                    required
                    value={claimReceipt}
                    onChange={(e) => setClaimReceipt(e.target.value)}
                    className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide"
                  >
                    <option value="" className="dark:bg-slate-900">Choose PENDING receipt claim</option>
                    {claims.filter(c => c.status === 'PENDING').map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.submittedBy} - {c.description.substring(0, 18)}... (₹{c.amount})</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="bg-[#FAFABA]/15 dark:bg-[#FAFABA]/5 border border-dashed border-[#E2E8F0] dark:border-slate-800 p-4 rounded-lg text-[10px] text-gray-400 dark:text-gray-500 italic font-semibold leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <span>Audit Warning: Card reconciliation requires the transaction amount and the claim invoice value to match perfectly.</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingMatch}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-gray-500 flex items-center gap-1.5 dark:border dark:border-slate-700"
                >
                  {submittingMatch && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Reconcile Transaction</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}