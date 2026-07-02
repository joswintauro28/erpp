"use client";

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        // Unauthenticated user attempting to access protected layout
        router.push('/login');
      } else if (user && isAuthPage) {
        // Authenticated user trying to access public login/signup pages
        router.push('/');
      }
    }
  }, [user, loading, isAuthPage, router]);

  // Show dynamic hydration screen while loading authentication state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-slate-950 select-none">
        <div className="w-8 h-8 border-3 border-gray-200 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse font-sans">
          Hydrating Multi-Tenant Workspace...
        </span>
      </div>
    );
  }

  // Prevent flash of content during redirections
  if (!user && !isAuthPage) {
    return null;
  }
  if (user && isAuthPage) {
    return null;
  }

  // Render auth pages directly without Sidebar or Header panels
  if (isAuthPage) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4 w-full">
        {children}
      </main>
    );
  }

  // Render fully protected Dashboard structure
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header />
        <main className="p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
