"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Mail, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [logoFailed, setLogoFailed] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Store token and tenantId for AuthContext
      localStorage.setItem('token', res.data.token);
      if (res.data.activeOrganization) {
        localStorage.setItem('tenantId', res.data.activeOrganization.id);
      } else {
        localStorage.removeItem('tenantId');
      }

      // Re-hydrate AuthContext state
      await refreshUser();

      // Redirect to protected dashboard path
      router.push('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const message = err.response?.data?.error || err.message || 'Server authentication handshake failed.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 select-none">
      <div className="p-8 space-y-6">
        
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2">
            {logoFailed ? (
              <div className="w-full h-full bg-black dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-inner">
                <span className="text-xl font-bold font-mono text-white">K</span>
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
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center justify-center gap-1.5 font-sans">
            <span>Sign in to Kaasvex</span>
            <Sparkles className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Enterprise dynamic billing intelligence control deck</p>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3 text-rose-700 dark:text-rose-300 text-xs font-semibold leading-relaxed animate-in shake-in duration-200">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="email" 
                required
                placeholder="e.g. nikhil@kaasvex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-medium"
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wide">
                Security Password
              </label>
              <Link href="#" className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-1 rounded-md transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Trigger Button */}
          <button 
            type="submit"
            disabled={submitting}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
            ) : null}
            <span>Sign In</span>
          </button>

        </form>
      </div>

      {/* Footer link to sign up page */}
      <div className="px-8 py-4 bg-[#FAFABA]/10 dark:bg-slate-950/20 border-t border-[#EEEEEE] dark:border-slate-800 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        New to Kaasvex?{' '}
        <Link href="/signup" className="text-black dark:text-white font-bold hover:underline transition-all">
          Create organization workspace
        </Link>
      </div>
    </div>
  );
}
