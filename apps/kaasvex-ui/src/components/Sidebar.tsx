"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  UserCheck, 
  FileText, 
  Layers, 
  Wallet, 
  Landmark, 
  ShieldAlert, 
  BarChart3, 
  Package, 
  Box, 
  Sparkles, 
  Settings,
  FolderLock,
  Calendar,
  Zap,
  Bell,
  FolderOpen,
  Shield
} from 'lucide-react';

interface SidebarLink {
  href: string;
  label: string;
  icon: any;
}

interface SidebarGroup {
  label: string;
  icon: any;
  items: SidebarLink[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  
  // Track open state of nested categories
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    CRM: true,
    Billing: true,
    Accounting: true,
    Inventory: true,
  });

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupLabel]: !prev[groupLabel]
    }));
  };

  const groups: SidebarGroup[] = [
    {
      label: 'CRM',
      icon: Users,
      items: [
        { href: '/leads', label: 'Leads', icon: UserCheck },
        { href: '/clients', label: 'Clients', icon: Users },
      ]
    },
    {
      label: 'Billing',
      icon: FileText,
      items: [
        { href: '/invoices', label: 'Invoices', icon: FileText },
        { href: '/quotations', label: 'Quotations', icon: Layers },
        { href: '/subscriptions', label: 'Subscriptions', icon: Calendar },
        { href: '/payments', label: 'Payments', icon: Wallet },
        { href: '/documents', label: 'Documents', icon: FolderOpen },
      ]
    },
    {
      label: 'Accounting',
      icon: Landmark,
      items: [
        { href: '/ledger', label: 'General Ledger', icon: Landmark },
        { href: '/expenses', label: 'Expenses', icon: ShieldAlert },
        { href: '/reports', label: 'Reports', icon: BarChart3 },
        { href: '/compliance', label: 'Tax & Compliance', icon: FolderLock },
      ]
    },
    {
      label: 'Inventory',
      icon: Package,
      items: [
        { href: '/catalog', label: 'Products', icon: Package },
        { href: '/catalog/stock', label: 'Stock', icon: Box },
      ]
    }
  ];

  return (
    <aside className="w-60 bg-[#FAFAFA] dark:bg-slate-900 border-r border-[#EEEEEE] dark:border-slate-800 flex flex-col h-full z-20 shrink-0">
      {/* Sidebar Header Brand Area */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-[#F0F0F0] dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden group">
          {logoFailed ? (
            <div className="w-full h-full bg-black dark:bg-slate-850 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-black transition-transform duration-300 group-hover:scale-110" />
              <span className="font-extrabold text-white text-base tracking-tighter z-10 font-mono">K</span>
            </div>
          ) : (
            <img 
              src="/logo.png" 
              alt="Kaasvex Logo" 
              className="w-full h-full object-contain"
              onError={() => setLogoFailed(true)}
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="font-bold tracking-tight text-gray-900 dark:text-white text-sm font-sans leading-none">Kaasvex</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-550 font-medium mt-0.5">Business OS</span>
        </div>
      </div>

      {/* Navigation Scrollable Body */}
      <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto scrollbar-thin select-none">
        
        {/* Core Dashboard Link */}
        <Link 
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 transition-transform duration-300 ${pathname === '/' ? 'scale-110' : ''}`} />
          <span>Dashboard</span>
        </Link>

        <div className="h-2" />

        {/* Dynamic Nested Groups */}
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroups[group.label];
          
          return (
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GroupIcon className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>{group.label}</span>
                </div>
                {isGroupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>

              {/* Sub-items list with collapsible animation */}
              <div 
                className={`pl-4 space-y-0.5 overflow-hidden transition-all duration-300 ${
                  isGroupOpen ? 'max-h-40 opacity-100 py-0.5' : 'max-h-0 opacity-0 pointer-events-none'
                }`}
              >
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-[11px] font-medium transition-all duration-200 relative ${
                        isActive 
                          ? 'text-gray-900 dark:text-white font-bold bg-[#EFEFEF] dark:bg-slate-800' 
                          : 'text-gray-500 dark:text-gray-400 hover:bg-[#F4F4F4] dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 w-1 h-3 bg-black dark:bg-white rounded-r-md" />
                      )}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="h-4 my-2 border-t border-gray-100 dark:border-slate-800" />

        {/* AI Assistant Link */}
        <Link 
          href="/ai"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/ai' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          <span>AI Assistant</span>
        </Link>

        {/* Notifications Link */}
        <Link 
          href="/notifications"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/notifications' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Notifications</span>
        </Link>

        {/* Automations Link */}
        <Link 
          href="/workflows"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/workflows' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Automations</span>
        </Link>

        {/* Security & Audit Link */}
        <Link 
          href="/security"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/security' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Security & Audit</span>
        </Link>

        {/* Settings Link */}
        <Link 
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
            pathname === '/settings' 
              ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 text-gray-500 shrink-0" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Tenant Footer Scope Indicator */}
      <div className="p-4 border-t border-[#F0F0F0] dark:border-slate-800 bg-[#F9F9F9] dark:bg-slate-900/50 flex items-center justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1.5"><FolderLock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" /> TENANT_ISOLATION</span>
        <span className="bg-[#EFEFEF] dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold text-gray-500 dark:text-gray-400">v2.1</span>
      </div>
    </aside>
  );
}