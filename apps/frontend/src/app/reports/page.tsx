"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from '@/components/ui/Cards';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  Briefcase, 
  Target, 
  Users, 
  Activity, 
  Zap, 
  FileCode2, 
  ClipboardCopy, 
  Download, 
  SlidersHorizontal,
  Building2,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';

export default function ReportsPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'financial' | 'sales' | 'executive' | 'stack'>('financial');
  const [loading, setLoading] = useState(true);

  // Dashboards States
  const [finMetrics, setFinMetrics] = useState<any>(null);
  const [finTrend, setFinTrend] = useState<any[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);
  const [salesGrowth, setSalesGrowth] = useState<any[]>([]);
  const [execMetrics, setExecMetrics] = useState<any>(null);

  // BI Exporter configurations
  const [exportProvider, setExportProvider] = useState<'clickhouse' | 'superset' | 'powerbi'>('clickhouse');
  const [exportSchema, setExportSchema] = useState<string>('');
  const [loadingSchema, setLoadingSchema] = useState(false);
  
  const [syncConfigs, setSyncConfigs] = useState<any[]>([]);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [exportUrl, setExportUrl] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [finRes, salesRes, execRes, configRes] = await Promise.all([
        api.get('/analytics/financial'),
        api.get('/analytics/sales'),
        api.get('/analytics/executive'),
        api.get('/analytics/configs')
      ]);

      setFinMetrics(finRes.data.metrics);
      setFinTrend(finRes.data.trend || []);
      setSalesMetrics(salesRes.data.metrics);
      setSalesGrowth(salesRes.data.growth || []);
      setExecMetrics(execRes.data.metrics);
      setSyncConfigs(configRes.data.configs || []);
    } catch (err) {
      console.error('Failed to load corporate BI dashboards:', err);
    }
  };

  const fetchExportSchema = async (providerName: string) => {
    setLoadingSchema(true);
    try {
      const res = await api.get(`/analytics/export/${providerName}`);
      if (typeof res.data === 'object') {
        setExportSchema(JSON.stringify(res.data, null, 2));
      } else {
        setExportSchema(res.data);
      }
    } catch (err) {
      console.error('Failed to pull sync schema:', err);
      setExportSchema('-- Failed to compile database schema exports.');
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleUpdateSyncConfig = async (provider: string, enabled: boolean, url: string) => {
    try {
      await api.put('/analytics/configs', {
        provider,
        syncEnabled: enabled,
        exportUrl: url
      });
      // Refresh configurations
      const configRes = await api.get('/analytics/configs');
      setSyncConfigs(configRes.data.configs || []);
      alert(`${provider} sync status updated successfully.`);
    } catch (err) {
      console.error('Failed to update config:', err);
      alert('Failed to update synchronization settings.');
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      const hydrate = async () => {
        setLoading(true);
        await fetchDashboardData();
        setLoading(false);
      };
      hydrate();
    }
  }, [activeOrganization, authLoading]);

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchExportSchema(exportProvider);
      // Find active config
      const currentConf = syncConfigs.find(c => c.provider === exportProvider.toUpperCase());
      if (currentConf) {
        setSyncEnabled(currentConf.syncEnabled);
        setExportUrl(currentConf.exportUrl || '');
      } else {
        setSyncEnabled(false);
        setExportUrl('');
      }
    }
  }, [exportProvider, syncConfigs, activeOrganization, authLoading]);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportSchema);
    alert('Code snippet copied to clipboard!');
  };

  const handleDownloadSql = () => {
    const element = document.createElement("a");
    const file = new Blob([exportSchema], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `kaasvex_${exportProvider}_export.${exportProvider === 'powerbi' ? 'json' : 'sql'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) return <LoadingSpinner text="Compiling Enterprise Business Intelligence sheets..." />;

  // Circular gauge drawing helper
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
            <BarChart3 className="w-5 h-5 text-gray-800 dark:text-gray-200" />
            <span>Reporting & Business Intelligence</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 font-sans">Enterprise diagnostic summaries and analytics stack exports configured for ClickHouse, Metabase, and Power BI</p>
        </div>

        <button 
          onClick={() => setActiveTab('stack')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit shrink-0"
        >
          <FileCode2 className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span>Analytics Stack Exporter</span>
        </button>
      </div>

      {/* ================= MULTI-VIEW TABS CONTROL ================= */}
      <div className="flex items-center gap-1.5 border-b border-[#EEEEEE] dark:border-slate-800 select-none text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'financial' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Financial Dashboard
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'sales' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Sales Dashboard
        </button>
        <button
          onClick={() => setActiveTab('executive')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'executive' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Executive Command
        </button>
        <button
          onClick={() => setActiveTab('stack')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'stack' 
              ? 'text-gray-900 dark:text-white border-b-2 border-black dark:border-white font-bold' 
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          BI Analytics Stack
        </button>
      </div>

      {/* ================= TAB 1: FINANCIAL DASHBOARD ================= */}
      {activeTab === 'financial' && finMetrics && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Net Revenue */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Net Revenue Ingest</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{finMetrics.revenue.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">Reconciliation complete</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(75, '#10B981')}
                <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">Paid</span>
              </div>
            </div>

            {/* Outstanding Payments */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Outstanding Claims</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{finMetrics.outstanding.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold block">Awaiting collections</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(45, '#F59E0B')}
                <span className="absolute text-[10px] font-bold text-amber-600 dark:text-amber-400 font-mono">Receiv</span>
              </div>
            </div>

            {/* Taxes Due */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Taxes Collected</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{finMetrics.taxesDue.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-[#4F46E5] dark:text-[#6366F1] font-extrabold block">CGST, SGST, IGST liability</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(60, '#4F46E5')}
                <span className="absolute text-[10px] font-bold text-[#4F46E5] dark:text-[#6366F1] font-mono">Tax</span>
              </div>
            </div>

            {/* Cash Reserves */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Liquid Cash reserves</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{finMetrics.cashBalance.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">Account 1010</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(95, '#10B981')}
                <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">Reserve</span>
              </div>
            </div>

          </div>

          {/* Revenue vs Outflow Chart */}
          <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl p-5 shadow-xs h-[300px] flex flex-col">
            <div className="mb-4 shrink-0">
              <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#4F46E5]" /> 6-Month Fiscal Ingestion
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Revenues vs expenditures spline comparisons</p>
            </div>

            <div className="flex-1 w-full text-[10px] font-mono select-none">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={finTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1E293B" : "#F2F2F2"} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`]}
                    contentStyle={{ 
                      background: isDark ? '#0f172a' : '#fff', 
                      border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`, 
                      borderRadius: '8px', 
                      fontSize: '10px', 
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      color: isDark ? '#f3f4f6' : '#111827'
                    }} 
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Net Revenue" />
                  <Area type="monotone" dataKey="Outflow" stroke="#EF4444" fillOpacity={1} fill="url(#colorOut)" strokeWidth={1.5} name="OpEx Outflows" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 2: SALES DASHBOARD ================= */}
      {activeTab === 'sales' && salesMetrics && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Conversion Rate */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Lead Conversion Rate</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{salesMetrics.conversionRate}%</h3>
                <span className="text-[9px] text-[#4F46E5] dark:text-[#6366F1] font-extrabold block">Leads to Customers Won</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(salesMetrics.conversionRate, '#4F46E5')}
                <span className="absolute text-[10px] font-bold text-[#4F46E5] dark:text-[#6366F1] font-mono">Wins</span>
              </div>
            </div>

            {/* Clients Count */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Active Clients Signups</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{salesMetrics.clientCount} Clients</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">B2B cataloged accounts</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(85, '#10B981')}
                <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">B2B</span>
              </div>
            </div>

            {/* MRR */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Recurring Revenue (MRR)</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{salesMetrics.mrr.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-[#7C3AED] dark:text-[#a78bfa] font-extrabold block">SaaS subscriptions recurring</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(75, '#7C3AED')}
                <span className="absolute text-[10px] font-bold text-violet-650 dark:text-violet-400 font-mono">MRR</span>
              </div>
            </div>

            {/* ARR */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Annual Recurring (ARR)</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{salesMetrics.arr.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">ARR run-rate forecast</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(80, '#10B981')}
                <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">ARR</span>
              </div>
            </div>

          </div>

          {/* Client Growth Chart */}
          <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl p-5 shadow-xs h-[300px] flex flex-col">
            <div className="mb-4 shrink-0">
              <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#7C3AED]" /> B2B Client Registration Growth
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium">Monthly total client accounts trend</p>
            </div>

            <div className="flex-1 w-full text-[10px] font-mono select-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesGrowth} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1E293B" : "#F2F2F2"} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                  <Tooltip 
                    formatter={(v) => [`${v} Clients`]}
                    contentStyle={{ 
                      background: isDark ? '#0f172a' : '#fff', 
                      border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`, 
                      borderRadius: '8px', 
                      fontSize: '10px', 
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                      color: isDark ? '#f3f4f6' : '#111827'
                    }} 
                  />
                  <Line type="monotone" dataKey="Clients" stroke={isDark ? "#a78bfa" : "#7C3AED"} strokeWidth={2.5} dot={{ fill: isDark ? '#a78bfa' : '#7C3AED', strokeWidth: 1 }} name="Total Clients" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 3: EXECUTIVE COMMAND ================= */}
      {activeTab === 'executive' && execMetrics && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Monthly Burn Rate */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Monthly Burn Rate</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{execMetrics.monthlyBurnRate.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-red-600 dark:text-red-400 font-extrabold block">Avg operating cash outflow</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(50, '#EF4444')}
                <span className="absolute text-[10px] font-bold text-red-500 dark:text-red-400 font-mono">Burn</span>
              </div>
            </div>

            {/* Net Profit Margin */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Net Margin Retention</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{execMetrics.margin}%</h3>
                <span className="text-[9px] text-[#4F46E5] dark:text-[#6366F1] font-extrabold block">Billing profit margin</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(execMetrics.margin * 2.5, '#4F46E5')}
                <span className="absolute text-[10px] font-bold text-[#4F46E5] dark:text-[#6366F1] font-mono">Margin</span>
              </div>
            </div>

            {/* runway */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Estimated Cash Runway</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{execMetrics.runwayMonths} Months</h3>
                <span className={`text-[9px] font-extrabold block ${execMetrics.runwayMonths >= 6 ? 'text-emerald-600' : 'text-red-600 dark:text-red-400'}`}>
                  {execMetrics.runwayMonths >= 6 ? 'Liquidity is Stable' : 'Critical cash alert!'}
                </span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(execMetrics.runwayMonths * 8, execMetrics.runwayMonths >= 6 ? '#10B981' : '#EF4444')}
                <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300 font-mono">Mos</span>
              </div>
            </div>

            {/* AI Health Index */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">AI Business Health</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{execMetrics.healthScore}%</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold block">Operating indicators safe</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(execMetrics.healthScore, '#7C3AED')}
                <span className="absolute text-[10px] font-bold text-violet-600 dark:text-violet-400 font-mono">Health</span>
              </div>
            </div>

          </div>

          {/* Business KPIs Summary Card */}
          <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-violet-600" /> Operational Business KPIs
              </h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-550 font-medium">AI compiled executive indicators and health recommendations</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-1">
                <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Liquidity Risk</span>
                <p className="text-gray-700 dark:text-gray-300 font-bold leading-normal">
                  Current runway months ({execMetrics.runwayMonths} mo) is {execMetrics.runwayMonths >= 6 ? 'fully aligned with Indian corporate guidelines.' : 'below the standard 6 months runway threshold. Consider auditing software expenses.'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-1">
                <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Margin Optimizations</span>
                <p className="text-gray-700 dark:text-gray-300 font-bold leading-normal">
                  Your margin retention yield ({execMetrics.margin}%) is excellent. Increasing SaaS seat multipliers will scale ARR run-rate with zero cost additions.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 space-y-1">
                <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Audit & Parity Checks</span>
                <p className="text-gray-700 dark:text-gray-300 font-bold leading-normal">
                  All ledger assets, inventory valuations, and accounts payable are fully balanced, showing perfect transaction symmetry.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 4: BI ANALYTICS STACK EXPORTER ================= */}
      {activeTab === 'stack' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Left panel: Config and Selector */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Selector Card */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Analytics Stack Integration</span>
                <p className="text-[9px] text-gray-400 dark:text-gray-550 mt-0.5 leading-relaxed">Select BI provider to view copy-pasteable SQL views, columnar schemas, or OData connector parameters.</p>
              </div>

              {/* Selector select */}
              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Select BI Stack *</label>
                <div className="relative">
                  <select
                    value={exportProvider}
                    onChange={(e) => setExportProvider(e.target.value as any)}
                    className="appearance-none w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all cursor-pointer font-bold uppercase tracking-wide font-sans"
                  >
                    <option value="clickhouse">ClickHouse Columnar SQL</option>
                    <option value="superset">Metabase / Apache Superset views</option>
                    <option value="powerbi">Microsoft Power BI OData Feed</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Sync Configuration Form */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">Automated Sync Configuration</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={syncEnabled}
                      onChange={(e) => {
                        setSyncEnabled(e.target.checked);
                        handleUpdateSyncConfig(exportProvider.toUpperCase(), e.target.checked, exportUrl);
                      }}
                      className="sr-only peer" 
                    />
                    <div className="w-7 h-4 bg-zinc-200 dark:bg-slate-750 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-black dark:peer-checked:bg-white" />
                  </label>
                </div>

                {syncEnabled && (
                  <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                    <label className="block text-[9px] font-extrabold text-gray-400 dark:text-gray-550 uppercase tracking-wide">Integration Stream URL</label>
                    <input 
                      type="text" 
                      placeholder="e.g. https://clickhouse-stream.vex.com"
                      value={exportUrl}
                      onChange={(e) => setExportUrl(e.target.value)}
                      className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-[10px] text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-750 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateSyncConfig(exportProvider.toUpperCase(), syncEnabled, exportUrl)}
                      className="w-full py-1.5 text-[9px] font-extrabold bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded transition-colors"
                    >
                      Update Sync Connection URL
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Information Card */}
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs space-y-3 text-[10px] text-gray-400 dark:text-gray-500 leading-normal flex items-start gap-1.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-gray-600 dark:text-gray-300 block uppercase text-[9px] tracking-wide mb-1">Clickhouse Columnar Design</span>
                Column-oriented storage layouts compile invoices and ledger rows into time-series dimensions, allowing large-scale BI aggregators to process millions of transactions in sub-millisecond timelines.
              </div>
            </div>

          </div>

          {/* Right panel: SQL Editor Preview */}
          <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 dark:border-slate-800 rounded-xl shadow-lg flex flex-col h-[400px]">
            
            {/* Header copy buttons */}
            <div className="px-5 py-3.5 border-b border-zinc-900 dark:border-slate-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
              <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
                {exportProvider === 'powerbi' ? 'json-odata-data-feed.json' : `kaasvex_${exportProvider}_export.sql`}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyToClipboard}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  <span>Copy Snippet</span>
                </button>
                <button
                  onClick={handleDownloadSql}
                  className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SQL</span>
                </button>
              </div>
            </div>

            {/* Code Block Pre */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[10.5px] leading-relaxed text-emerald-400 dark:text-emerald-300 scrollbar-thin select-text">
              {loadingSchema ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
                  <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                  <span className="text-[9px] font-bold uppercase tracking-widest font-mono">Compiling columnar schemas...</span>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{exportSchema}</pre>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}