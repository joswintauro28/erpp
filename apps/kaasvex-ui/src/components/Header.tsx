"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Bell, Building2, ChevronDown, User, HelpCircle, LogOut, Sun, Moon } from 'lucide-react';

export default function Header() {
  const { user, organizations, activeOrganization, switchOrganization, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Fallbacks in case user is not logged in or no organizations exist
  const activeOrgName = activeOrganization ? activeOrganization.name : 'Acme Corp';
  const displayUserName = user ? user.name : 'John Doe';
  const displayUserEmail = user ? user.email : 'john.doe@kaasvex.com';
  const displayRole = activeOrganization ? activeOrganization.role : 'Owner';
  const displayInitials = displayUserName.substring(0, 2).toUpperCase();

  const handleSignOut = () => {
    logoutUser();
    alert('Logged out successfully.');
    window.location.href = window.location.pathname;
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between px-8 shrink-0 sticky top-0 z-30 select-none">
      
      {/* 1. Global Search Box */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search invoices, clients, products..." 
          className="w-full bg-[#F5F5F5] dark:bg-slate-800 text-xs pl-10 pr-4 py-2 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-200 dark:focus:bg-slate-900 dark:focus:border-slate-700 text-gray-700 dark:text-gray-200 transition-all duration-200 placeholder:text-gray-400"
        />
      </div>

      {/* 2. Top Right Actions and Profiles */}
      <div className="flex items-center gap-4 relative">
        
        {/* Workspace/Tenant Switcher Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowTenantDropdown(!showTenantDropdown);
              setShowProfileDropdown(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#EBEBEB] dark:border-slate-850 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 transition-all duration-200"
          >
            <Building2 className="w-3.5 h-3.5 text-gray-500" />
            <span>{activeOrgName}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showTenantDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showTenantDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-[#EAEAEA] dark:border-slate-800 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="block px-3 py-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-50 dark:border-slate-800">Switch Organization</span>
              
              {organizations.length === 0 ? (
                <button
                  onClick={() => setShowTenantDropdown(false)}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-slate-800/50"
                >
                  Acme Corp (Default)
                </button>
              ) : (
                organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                      activeOrganization?.id === org.id 
                        ? 'bg-gray-50 dark:bg-slate-800 text-black dark:text-white font-bold' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800/80 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{org.name}</span>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-normal">{org.role}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === 'light' ? (
            <Moon className="w-4.5 h-4.5" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-amber-500" />
          )}
        </button>

        {/* Notifications Bell */}
        <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[#EEEEEE] dark:bg-slate-800" />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowTenantDropdown(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center shadow-inner relative overflow-hidden group">
              <span className="z-10">{displayInitials}</span>
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-black transition-transform duration-200 group-hover:scale-105" />
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">{displayUserName}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{displayRole}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-[#EAEAEA] dark:border-slate-800 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-gray-50 dark:border-slate-800">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{displayUserName}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate">{displayUserEmail}</p>
              </div>
              <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-colors">
                <User className="w-3.5 h-3.5" />
                <span>My Settings</span>
              </Link>
              <Link href="/help" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-colors">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help & Support</span>
              </Link>
              <div className="border-t border-gray-50 dark:border-slate-800 my-1" />
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}