"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  FileText, 
  Users, 
  Calendar, 
  Plus, 
  Sparkles,
  AlertTriangle,
  ArrowRightCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

// Custom cell colors for Invoice Collection Rate Pie Chart
const PIE_COLORS = {
  Paid: '#10B981',     // Elegant emerald green
  Pending: '#F59E0B',  // Amber yellow
  Overdue: '#EF4444',  // Rose red
};

const PIE_DATA = [
  { name: 'Paid', value: 60 },
  { name: 'Pending', value: 25 },
  { name: 'Overdue', value: 15 },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    // Mimic rapid workspace hydration
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 1. Spline Area Chart Data: Revenue Trend (Jan - Jun)
  const revenueTrendData = [
    { name: 'Jan', revenue: 45000 },
    { name: 'Feb', revenue: 52000 },
    { name: 'Mar', revenue: 49000 },
    { name: 'Apr', revenue: 63000 },
    { name: 'May', revenue: 78000 },
    { name: 'Jun', revenue: 84000 },
  ];

  // 2. Bar Chart Data: Monthly Cash Flow (Inflow vs Outflow)
  const cashFlowData = [
    { name: 'Jan', Inflow: 65000, Outflow: 42000 },
    { name: 'Feb', Inflow: 72000, Outflow: 48000 },
    { name: 'Mar', Inflow: 68000, Outflow: 51000 },
    { name: 'Apr', Inflow: 82000, Outflow: 54000 },
    { name: 'May', Inflow: 75000, Outflow: 49000 },
    { name: 'Jun', Inflow: 88000, Outflow: 58000 },
  ];

  // 3. Recent Invoices Ledger
  const recentInvoices = [
    { id: 'INV-1234', client: 'Acme Corp', amount: 5200, status: 'Paid', date: '2026-05-20' },
    { id: 'INV-1235', client: 'Tech Solutions', amount: 3800, status: 'Pending', date: '2026-05-27' },
    { id: 'INV-1236', client: 'Global Industries', amount: 12500, status: 'Overdue', date: '2026-05-29' },
  ];

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-gray-100 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">Hydrating Multi-Tenant Workspace...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">Dashboard</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5 font-sans">Welcome back! Here's your business overview.</p>
        </div>
        
        {/* Date Filter & Ingress CTA */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Last 30 days</span>
          </button>
          
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* ================= 4x KPI CARD GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Revenue */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs relative hover:shadow-sm dark:hover:shadow-md/20 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Revenue</span>
            <DollarSign className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">$124,500</h3>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +12.5%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">from last month</span>
          </div>
        </div>

        {/* KPI 2: Outstanding Payments */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs relative hover:shadow-sm dark:hover:shadow-md/20 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Outstanding Payments</span>
            <CreditCard className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">$32,450</h3>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingDown className="w-2.5 h-2.5" /> -3.2%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">from last month</span>
          </div>
        </div>

        {/* KPI 3: Invoices Sent */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs relative hover:shadow-sm dark:hover:shadow-md/20 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Invoices Sent</span>
            <FileText className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">145</h3>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +8.3%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">from last month</span>
          </div>
        </div>

        {/* KPI 4: Active Clients */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs relative hover:shadow-sm dark:hover:shadow-md/20 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Clients</span>
            <Users className="w-4 h-4 text-gray-300 dark:text-gray-650" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">89</h3>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" /> +5.4%
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">from last month</span>
          </div>
        </div>

      </div>

      {/* ================= INTERACTIVE CHARTS ROW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Chart 1: Revenue Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col h-[320px]">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Revenue Trend</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Monthly revenue over the last 6 months</p>
          </div>
          
          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={isDark ? 0.15 : 0.08}/>
                    <stop offset="95%" stopColor={isDark ? "#ffffff" : "#000000"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1E293B" : "#F2F2F2"} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: '500' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: '500' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip 
                  formatter={(v) => [`$${v.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ 
                    background: isDark ? '#0f172a' : '#fff', 
                    border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`, 
                    borderRadius: '8px', 
                    fontSize: '11px', 
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stroke={isDark ? "#ffffff" : "#000000"} fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Monthly Cash Flow (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col h-[320px]">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Monthly Cash Flow</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Inflow vs Outflow comparison</p>
          </div>

          <div className="flex-1 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1E293B" : "#F2F2F2"} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: '500' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: '500' }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip 
                  formatter={(v) => [`$${v.toLocaleString()}`]}
                  contentStyle={{ 
                    background: isDark ? '#0f172a' : '#fff', 
                    border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`, 
                    borderRadius: '8px', 
                    fontSize: '11px', 
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    color: isDark ? '#f3f4f6' : '#111827'
                  }} 
                />
                <Bar dataKey="Inflow" fill={isDark ? "#ffffff" : "#000000"} radius={[2, 2, 0, 0]} barSize={10} />
                <Bar dataKey="Outflow" fill={isDark ? "#334155" : "#E4E4E7"} radius={[2, 2, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ================= BOTTOM GRID ROW (PIE, INSIGHTS, TABLE) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 1. Donut Chart breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col h-[280px]">
          <div>
            <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Invoice Collection Rate</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Status breakdown of all invoices</p>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Absolute Label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-gray-900 dark:text-white">85%</span>
              <span className="text-[8px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Healthy</span>
            </div>
          </div>

          {/* Color Indicators Legends */}
          <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-50 dark:border-slate-800">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> Paid: 60%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Pending: 25%</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Overdue: 15%</span>
          </div>
        </div>

        {/* 2. AI Insights panel */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col h-[280px]">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" /> AI Insights
              </h4>
              <span className="text-[8px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded font-mono">VEX.AI</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Business intelligence and recommendations</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
            
            {/* Insight 1: Forecast */}
            <div className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:border-violet-100 dark:hover:border-violet-900 transition-colors bg-gradient-to-r from-white to-violet-50/10 dark:from-slate-900 dark:to-violet-950/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-800 dark:text-gray-200">
                <span>Revenue Forecast</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">+16.7%</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 leading-normal">
                Expected to reach <span className="font-bold text-black dark:text-white">$150K</span> next month based on historical trends.
              </p>
            </div>

            {/* Insight 2: Risk */}
            <div className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:border-red-100 dark:hover:border-red-950 transition-colors bg-gradient-to-r from-white to-red-50/10 dark:from-slate-900 dark:to-red-950/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-800 dark:text-gray-200">
                <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Collection Risk</span>
                <span className="text-red-500 dark:text-red-400 font-mono">3 Invoices</span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 leading-normal">
                3 invoices at risk of becoming overdue this week.
              </p>
            </div>

            {/* Insight 3: Quick Action */}
            <div className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:border-emerald-100 dark:hover:border-emerald-950 transition-colors bg-gradient-to-r from-white to-emerald-50/10 dark:from-slate-900 dark:to-emerald-950/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-800 dark:text-gray-200">
                <span>Recommended Action</span>
                <ArrowRightCircle className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 leading-normal">
                Send payment reminders to Sellers with pending invoices.
              </p>
            </div>

          </div>
        </div>

        {/* 3. Recent activity table */}
        <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col h-[280px]">
          <div className="mb-4">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">Recent Invoices</h4>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Latest invoice activity</p>
          </div>

          <div className="flex-1 overflow-x-auto text-[11px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#F0F0F0] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold">
                  <th className="pb-2 font-semibold">Invoice ID</th>
                  <th className="pb-2 font-semibold">Client</th>
                  <th className="pb-2 font-semibold">Amount</th>
                  <th className="pb-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-850 font-medium">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-bold text-gray-800 dark:text-gray-200">{inv.id}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{inv.client}</td>
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">${inv.amount.toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                        inv.status === 'Paid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450' :
                        inv.status === 'Pending' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-450' :
                        'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-450'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}