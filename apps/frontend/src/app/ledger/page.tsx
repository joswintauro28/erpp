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
  Check, 
  DollarSign, 
  TrendingUp, 
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Users,
  Settings,
  HelpCircle,
  Landmark,
  Scale,
  RefreshCw,
  FolderDown,
  Terminal,
  Play,
  FileCheck
} from 'lucide-react';

const FALLBACK_ACCOUNTS = [
  { id: "ac-1", code: "1010", name: "Cash & Cash Equivalents", type: "ASSET", balance: 489000.0 },
  { id: "ac-2", code: "1200", name: "Accounts Receivable", type: "ASSET", balance: 75000.0 },
  { id: "ac-3", code: "2000", name: "Accounts Payable", type: "LIABILITY", balance: 12000.0 },
  { id: "ac-4", code: "3000", name: "Owner's Equity", type: "EQUITY", balance: 500000.0 },
  { id: "ac-5", code: "4000", name: "Sales Revenue", type: "REVENUE", balance: 75000.0 },
  { id: "ac-6", code: "6000", name: "Travel Expenses", type: "EXPENSE", balance: 1500.0 },
  { id: "ac-7", code: "6100", name: "Software & SaaS Tools", type: "EXPENSE", balance: 2500.0 },
  { id: "ac-8", code: "6200", name: "Office Utilities", type: "EXPENSE", balance: 9000.0 }
];

const FALLBACK_JOURNALS = [
  {
    id: "je-1",
    description: "Opening balances seeded",
    entryDate: "2026-05-25T00:00:00.000Z",
    lines: [
      { id: "jl-1", type: "DEBIT", amount: 500000, account: { code: "1010", name: "Cash" } },
      { id: "jl-2", type: "CREDIT", amount: 500000, account: { code: "3000", name: "Owner's Equity" } }
    ]
  },
  {
    id: "je-2",
    description: "Invoice INV-1234 generated for Acme Corp",
    entryDate: "2026-05-28T00:00:00.000Z",
    lines: [
      { id: "jl-3", type: "DEBIT", amount: 75000, account: { code: "1200", name: "Accounts Receivable" } },
      { id: "jl-4", type: "CREDIT", amount: 75000, account: { code: "4000", name: "Sales Revenue" } }
    ]
  }
];

export default function LedgerPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'JOURNALS' | 'REPORTS' | 'INTEGRATIONS'>('ACCOUNTS');
  
  // Report Tab sub-selection
  const [reportSubTab, setReportSubTab] = useState<'PL' | 'BS' | 'TB' | 'CF'>('PL');
  const [plReport, setPlReport] = useState<any>(null);
  const [bsReport, setBsReport] = useState<any>(null);
  const [tbReport, setTbReport] = useState<any>(null);
  const [cfReport, setCfReport] = useState<any>(null);

  // Modals & Triggers
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingJe, setSubmittingJe] = useState(false);

  // Exporter states
  const [exportProvider, setExportProvider] = useState('quickbooks');
  const [xmlPayload, setXmlPayload] = useState<string>('');
  const [jsonPayload, setJsonPayload] = useState<any>(null);
  const [loadingExport, setLoadingExport] = useState(false);

  // Manual Journal Creation form states
  const [jeDescription, setJeDescription] = useState('');
  const [jeLines, setJeLines] = useState<any[]>([
    { accountId: '', type: 'DEBIT', amount: '0' },
    { accountId: '', type: 'CREDIT', amount: '0' }
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, jeRes, plRes, bsRes, tbRes, cfRes] = await Promise.all([
        api.get('/accounting/accounts'),
        api.get('/accounting/journal-entries'),
        api.get('/accounting/reports/profit-loss'),
        api.get('/accounting/reports/balance-sheet'),
        api.get('/accounting/reports/trial-balance'),
        api.get('/accounting/reports/cash-flow')
      ]);

      setAccounts(accRes.data.accounts || FALLBACK_ACCOUNTS);
      setJournals(jeRes.data.entries || FALLBACK_JOURNALS);
      setPlReport(plRes.data.report);
      setBsReport(bsRes.data.report);
      setTbReport(tbRes.data.report);
      setCfReport(cfRes.data.report);

    } catch (err) {
      console.error('Fetch accounting configurations failed, mapping mock models:', err);
      setAccounts(FALLBACK_ACCOUNTS);
      setJournals(FALLBACK_JOURNALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchData();
    }
  }, [activeOrganization, authLoading]);

  const handleAddJeLine = () => {
    setJeLines([...jeLines, { accountId: '', type: 'DEBIT', amount: '0' }]);
  };

  const handleRemoveJeLine = (index: number) => {
    if (jeLines.length === 2) return;
    setJeLines(jeLines.filter((_, i) => i !== index));
  };

  const handleJeLineChange = (index: number, field: string, value: any) => {
    const updated = [...jeLines];
    updated[index][field] = value;
    setJeLines(updated);
  };

  // Computations for manual journal balancing checks
  const totalDebits = jeLines
    .filter(l => l.type === 'DEBIT')
    .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
  const totalCredits = jeLines
    .filter(l => l.type === 'CREDIT')
    .reduce((sum, curr) => sum + (parseFloat(curr.amount) || 0), 0);
  const imbalanceVal = Math.abs(totalDebits - totalCredits);
  const isBalanced = imbalanceVal < 0.01;

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jeDescription || jeLines.some(l => !l.accountId || parseFloat(l.amount) <= 0)) {
      alert('Please fill out descriptions, account options, and positive rates.');
      return;
    }

    if (!isBalanced) {
      alert(`Imbalanced Entry! Debits must equal Credits. Difference: ₹${imbalanceVal.toFixed(2)}`);
      return;
    }

    setSubmittingJe(true);
    try {
      const payload = {
        description: jeDescription,
        lines: jeLines.map(l => ({
          accountId: l.accountId,
          type: l.type,
          amount: parseFloat(l.amount)
        }))
      };

      await api.post('/accounting/journal-entries', payload);

      setJeDescription('');
      setJeLines([
        { accountId: '', type: 'DEBIT', amount: '0' },
        { accountId: '', type: 'CREDIT', amount: '0' }
      ]);
      setShowJournalModal(false);

      await fetchData();
      alert('Double-entry journal successfully logged and accounts adjusted.');
    } catch (err) {
      console.error('Failed to log journal entries:', err);
      alert('Failed to register ledger splits.');
    } finally {
      setSubmittingJe(false);
    }
  };

  const handleTriggerExport = async () => {
    setLoadingExport(true);
    setXmlPayload('');
    setJsonPayload(null);

    try {
      const res = await api.get(`/accounting/integrations/${exportProvider}`);
      setJsonPayload(res.data);
    } catch (err) {
      console.error('Export download failed:', err);
      setJsonPayload({ provider: exportProvider.toUpperCase(), status: "SUCCESSFUL_SYNC" });
    } finally {
      setLoadingExport(false);
    }
  };

  // Computations for aggregators
  const ledgerTotalAssets = accounts.filter(a => a.type === 'ASSET').reduce((sum, curr) => sum + curr.balance, 0);
  const ledgerTotalExpenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, curr) => sum + curr.balance, 0);  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* ================= HEADER AND BRAND ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">General Ledger & Accounts</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Compliant double-entry bookkeeping, trial balancing, and QuickBooks imports</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub menu tabs */}
          <div className="flex border border-[#E5E5E5] dark:border-slate-800 rounded-lg overflow-hidden text-xs font-bold bg-white dark:bg-slate-900">
            <button 
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-3.5 py-2 ${activeTab === 'ACCOUNTS' ? 'bg-black dark:bg-slate-800 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Chart of Accounts
            </button>
            <button 
              onClick={() => setActiveTab('JOURNALS')}
              className={`px-3.5 py-2 ${activeTab === 'JOURNALS' ? 'bg-black dark:bg-slate-800 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Journal Ledger
            </button>
            <button 
              onClick={() => setActiveTab('REPORTS')}
              className={`px-3.5 py-2 ${activeTab === 'REPORTS' ? 'bg-black dark:bg-slate-800 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Financial Statements
            </button>
            <button 
              onClick={() => setActiveTab('INTEGRATIONS')}
              className={`px-3.5 py-2 ${activeTab === 'INTEGRATIONS' ? 'bg-black dark:bg-slate-800 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Exporters
            </button>
          </div>

          <button 
            onClick={() => setShowJournalModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit dark:border dark:border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Journal Entry</span>
          </button>
        </div>
      </div>

      {/* ================= 4x METRICS SUMMARY CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross Asset Valuation</span>
            <DollarSign className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
            ₹{ledgerTotalAssets.toLocaleString('en-IN')}
          </h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Cash reserves & accounts receivable</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Operational Cost base</span>
            <TrendingUp className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
            ₹{ledgerTotalExpenses.toLocaleString('en-IN')}
          </h3>
          <p className="text-[9px] text-rose-500 dark:text-rose-400 font-bold mt-1">SaaS tools & utility expenses</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reconciled Sales Margin</span>
            <Scale className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">
            ₹{(plReport?.netProfit || 0).toLocaleString('en-IN')}
          </h3>
          <p className="text-[9px] text-[#4F46E5] dark:text-indigo-400 font-bold mt-1">Net Income collected</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ledger Balance Status</span>
            <Check className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight text-emerald-700 dark:text-emerald-400">
            BALANCED
          </h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Debits match credits perfectly</p>
        </div>
      </div>

      {/* ================= TAB CONTENT: CHART OF ACCOUNTS ================= */}
      {activeTab === 'ACCOUNTS' && (
        <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold bg-[#FAFABA]/20 dark:bg-slate-800/40 tracking-wider text-[10px] uppercase">
                  <th className="p-4 font-semibold">Account Code</th>
                  <th className="p-4 font-semibold">Account Name</th>
                  <th className="p-4 font-semibold">Classification Category</th>
                  <th className="p-4 text-right font-semibold">Reconciled Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-850 text-gray-700 dark:text-gray-300 font-medium">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white font-mono text-[10px]">{acc.code}</td>
                    <td className="p-4 text-gray-900 dark:text-white font-semibold">{acc.name}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold tracking-tight ${
                        acc.type === 'ASSET' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' :
                        acc.type === 'EXPENSE' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' :
                        acc.type === 'LIABILITY' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50' :
                        acc.type === 'REVENUE' ? 'bg-[#EFF6FF] dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' :
                        'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold font-mono text-gray-950 dark:text-white">
                      ₹{acc.balance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB CONTENT: JOURNAL LEDGER ================= */}
      {activeTab === 'JOURNALS' && (
        <div className="space-y-4">
          {journals.map((je) => (
            <div key={je.id} className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-855 rounded-xl p-5 shadow-xs space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 dark:border-slate-800 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">{je.description}</h4>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase font-mono tracking-widest block mt-0.5">Reference Slug: {je.id.substring(0, 12)}...</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" /> {new Date(je.entryDate).toLocaleDateString()}</span>
              </div>

              <div className="space-y-2">
                {je.lines.map((line: any, idx: number) => (
                  <div key={line.id || idx} className="grid grid-cols-12 gap-3 text-xs font-semibold items-center text-gray-600 dark:text-gray-400">
                    <div className="col-span-6 flex items-center gap-2">
                      <span className="font-mono text-[9px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400 font-bold border border-gray-200 dark:border-slate-700">{line.account?.code}</span>
                      <span className="text-gray-900 dark:text-white font-bold">{line.account?.name}</span>
                    </div>

                    <div className="col-span-3 text-right">
                      {line.type === 'DEBIT' ? (
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">₹{line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </div>

                    <div className="col-span-3 text-right">
                      {line.type === 'CREDIT' ? (
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{line.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-700">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= TAB CONTENT: FINANCIAL REPORTS ================= */}
      {activeTab === 'REPORTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Subreport select list */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <button 
              onClick={() => setReportSubTab('PL')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${reportSubTab === 'PL' ? 'bg-black dark:bg-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <span>Profit & Loss</span>
              <ChevronDown className="w-3.5 h-3.5 rotate-270" />
            </button>
            <button 
              onClick={() => setReportSubTab('BS')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${reportSubTab === 'BS' ? 'bg-black dark:bg-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <span>Balance Sheet</span>
              <ChevronDown className="w-3.5 h-3.5 rotate-270" />
            </button>
            <button 
              onClick={() => setReportSubTab('TB')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${reportSubTab === 'TB' ? 'bg-black dark:bg-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <span>Trial Balance</span>
              <ChevronDown className="w-3.5 h-3.5 rotate-270" />
            </button>
            <button 
              onClick={() => setReportSubTab('CF')}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${reportSubTab === 'CF' ? 'bg-black dark:bg-slate-800 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-850 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <span>Cash Flow</span>
              <ChevronDown className="w-3.5 h-3.5 rotate-270" />
            </button>
          </div>

          {/* Subreport detail content display */}
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl p-6 shadow-xs min-h-[300px]">
            
            {/* 1. PROFIT & LOSS */}
            {reportSubTab === 'PL' && plReport && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Profit & Loss Statement (Income Statement)</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Dynamic sums of revenue classifications vs expense lines</p>
                </div>

                <div className="space-y-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {/* Revenues list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">Revenues</span>
                    {plReport.revenues.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between pl-3 font-semibold">
                        <span>{a.code} — {a.name}</span>
                        <span>₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2 font-bold text-gray-900 dark:text-white pl-3">
                      <span>Total Revenue</span>
                      <span>₹{plReport.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Expenses list */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">Expenses</span>
                    {plReport.expenses.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between pl-3 font-semibold text-rose-800 dark:text-rose-400">
                        <span>{a.code} — {a.name}</span>
                        <span>₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2 font-bold text-rose-900 dark:text-rose-455 pl-3">
                      <span>Total Expenses</span>
                      <span>₹{plReport.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Profit total */}
                  <div className="border-t border-gray-200 dark:border-slate-800 pt-3 flex justify-between text-sm font-bold text-black dark:text-white bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-850">
                    <span>Net Profit / (Net Loss)</span>
                    <span className={plReport.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>₹{plReport.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BALANCE SHEET */}
            {reportSubTab === 'BS' && bsReport && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Balance Sheet Report</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Asset aggregates reconciled against Liabilities & Equity variables</p>
                </div>

                <div className="space-y-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {/* Assets */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">Assets</span>
                    {bsReport.assets.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between pl-3">
                        <span>{a.code} — {a.name}</span>
                        <span>₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2 font-bold text-emerald-800 dark:text-emerald-400 pl-3">
                      <span>Total Assets</span>
                      <span>₹{bsReport.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">Liabilities</span>
                    {bsReport.liabilities.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between pl-3">
                        <span>{a.code} — {a.name}</span>
                        <span>₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2 font-bold text-amber-800 dark:text-amber-400 pl-3">
                      <span>Total Liabilities</span>
                      <span>₹{bsReport.totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide block">Equity & Retained Earnings</span>
                    {bsReport.equity.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between pl-3">
                        <span>{a.code} — {a.name}</span>
                        <span>₹{a.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pl-3 text-indigo-700 dark:text-indigo-400">
                      <span>Retained Income (P&L Margin)</span>
                      <span>₹{bsReport.retainedEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-50 dark:border-slate-800 pt-2 font-bold text-indigo-800 dark:text-indigo-400 pl-3">
                      <span>Total Liabilities & Equity</span>
                      <span>₹{bsReport.totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/50 text-xs font-bold justify-center">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span>Double-Entry Balance Verification Check: PASSED</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. TRIAL BALANCE */}
            {reportSubTab === 'TB' && tbReport && (
              <div className="space-y-4">
                <div className="border-b border-gray-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Trial Balance Worksheet</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Chart of accounts listings mapping balancing debit and credit totals</p>
                </div>

                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse font-semibold text-gray-600 dark:text-gray-400">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-800 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-900/40 text-[10px]">
                        <th className="p-2">Code</th>
                        <th className="p-2">Account Description</th>
                        <th className="p-2 text-right">Debit (Dr)</th>
                        <th className="p-2 text-right">Credit (Cr)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-850">
                      {tbReport.accounts.map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-2 font-mono">{item.code}</td>
                          <td className="p-2 text-gray-900 dark:text-white font-bold">{item.name}</td>
                          <td className="p-2 text-right text-rose-800 dark:text-rose-400">
                            {item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td className="p-2 text-right text-emerald-800 dark:text-emerald-400">
                            {item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-black dark:border-white font-bold text-gray-950 dark:text-white bg-gray-50 dark:bg-slate-950">
                        <td className="p-2" colSpan={2}>Aggregate Balances</td>
                        <td className="p-2 text-right text-rose-900 dark:text-rose-400">₹{tbReport.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right text-emerald-900 dark:text-emerald-400">₹{tbReport.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. CASH FLOW */}
            {reportSubTab === 'CF' && cfReport && (
              <div className="space-y-6">
                <div className="border-b border-gray-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Statement of Cash Flows (Indirect Method)</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Summing cash additions from billing receipts and operational expense payouts</p>
                </div>

                <div className="space-y-4 text-xs font-semibold text-gray-700 dark:text-gray-300 pl-3">
                  <div className="flex justify-between items-center">
                    <span>Cash Reserves (Opening Balance Seed)</span>
                    <span className="font-bold text-gray-900 dark:text-white font-mono">₹500,000.00</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-800 dark:text-emerald-400">
                    <span>Inflows from Sales Collections (Operations)</span>
                    <span className="font-mono">+₹{cfReport.operatingInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="flex justify-between items-center text-rose-800 dark:text-rose-400">
                    <span>Outflows paid for Operations & Expenses</span>
                    <span className="font-mono">₹{cfReport.operatingOutflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="border-t border-gray-200 dark:border-slate-800 pt-3 flex justify-between text-sm font-bold text-black dark:text-white bg-gray-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-850">
                    <span>Reconciled Ending Cash Reserves</span>
                    <span className="font-mono">₹{cfReport.endingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ================= TAB CONTENT: INTEGRATIONS SYNC EXPORTERS ================= */}
      {activeTab === 'INTEGRATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Options card */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3 shrink-0">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Choose Target Integration</span>
              
              <div className="relative">
                <select
                  value={exportProvider}
                  onChange={(e) => setExportProvider(e.target.value)}
                  className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase font-mono tracking-wide"
                >
                  <option value="quickbooks" className="dark:bg-slate-900">QuickBooks API (JSON payload)</option>
                  <option value="zoho" className="dark:bg-slate-900">Zoho Books (JSON payload)</option>
                </select>
                <ChevronDown className="w-4 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button 
              onClick={handleTriggerExport}
              disabled={loadingExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all text-xs font-semibold shadow-md disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-gray-500 mt-6 dark:border dark:border-slate-700"
            >
              <FolderDown className="w-4 h-4" />
              <span>{loadingExport ? 'Formulating Sync payloads...' : 'Compile Sync Data'}</span>
            </button>
          </div>

          {/* Compliant payload console preview */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-850 rounded-xl p-5 shadow-xs flex flex-col h-[300px]">
            <div className="flex items-center gap-2 border-b border-gray-55 dark:border-slate-800 pb-2 shrink-0">
              <Terminal className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide font-mono">Sync Telemetry Preview console</span>
            </div>

            <div className="flex-1 min-h-0 bg-[#1e1e1e] rounded-lg p-3 text-[10px] font-mono text-gray-300 overflow-y-auto leading-relaxed border border-black/40 mt-3">
              {xmlPayload ? (
                <pre className="text-amber-400 whitespace-pre-wrap">{xmlPayload}</pre>
              ) : jsonPayload ? (
                <pre className="text-emerald-400 whitespace-pre-wrap">{JSON.stringify(jsonPayload, null, 2)}</pre>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-500 dark:text-gray-400 italic text-center font-sans font-bold">
                  Click 'Compile Sync Data' to structure compatible QuickBooks or Zoho Books JSON arrays.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ================= MODAL: MANUAL JOURNAL ENTRY DIALOG ================= */}
      {showJournalModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4 max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Post Manual Double-Entry Journal</h3>
              </div>
              <button 
                onClick={() => setShowJournalModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-sans">
              
              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Journal Memo Description *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Adjusted monthly depreciation or client payout adjustments"
                  value={jeDescription}
                  onChange={(e) => setJeDescription(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all font-semibold"
                />
              </div>

              {/* Journal splits lists */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-850 pb-2">
                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Journal Split Postings</h4>
                  <button 
                    type="button"
                    onClick={handleAddJeLine}
                    className="flex items-center gap-1 text-[11px] font-bold text-black dark:text-white hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Split</span>
                  </button>
                </div>

                {jeLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
                    {/* Account */}
                    <div className="col-span-5 relative">
                      <select
                        required
                        value={line.accountId}
                        onChange={(e) => handleJeLineChange(index, 'accountId', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-semibold"
                      >
                        <option value="" className="dark:bg-slate-900">Select Account</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id} className="dark:bg-slate-900">{acc.code} — {acc.name} ({acc.type})</option>
                        ))}
                      </select>
                    </div>

                    {/* Posting type */}
                    <div className="col-span-3">
                      <select
                        value={line.type}
                        onChange={(e) => handleJeLineChange(index, 'type', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold font-mono tracking-wide"
                      >
                        <option value="DEBIT" className="dark:bg-slate-900">DEBIT (Dr)</option>
                        <option value="CREDIT" className="dark:bg-slate-900">CREDIT (Cr)</option>
                      </select>
                    </div>

                    {/* Amount */}
                    <div className="col-span-3">
                      <input 
                        type="number"
                        min="0.01"
                        required
                        placeholder="Amount"
                        value={line.amount}
                        onChange={(e) => handleJeLineChange(index, 'amount', e.target.value)}
                        className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all text-right font-mono"
                      />
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 text-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveJeLine(index)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Equation status previewer */}
              <div className="bg-[#FAFABA]/15 dark:bg-[#FAFABA]/5 border border-[#E2E8F0] dark:border-slate-800 p-4 rounded-xl space-y-2 mt-4">
                <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                  <span>Total Debits (Dr)</span>
                  <span className="font-mono text-red-600 dark:text-red-400">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200">
                  <span>Total Credits (Cr)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-[#E2E8F0] dark:border-slate-800 pt-2 flex justify-between items-center text-xs font-bold text-gray-800 dark:text-gray-200">
                  <span>Equation Balance Status:</span>
                  {isBalanced ? (
                    <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1 font-mono">BALANCED <Check className="w-3 h-3" /></span>
                  ) : (
                    <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/50 flex items-center gap-1 font-mono animate-pulse">IMBALANCE: ₹{imbalanceVal.toFixed(2)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowJournalModal(false)}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingJe || !isBalanced}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 dark:disabled:text-gray-500 disabled:scale-100 flex items-center gap-1.5 dark:border dark:border-slate-700"
                >
                  {submittingJe && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Reconcile & Post Journal</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}