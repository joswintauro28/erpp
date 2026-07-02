"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/hooks/useApi';
import { Sparkles, User, Mail, Lock, Building2, Globe, AlertTriangle, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  
  // Custom states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-generate organization slug from name in real-time
  useEffect(() => {
    const generated = organizationName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces/dashes
      .replace(/\s+/g, '-')          // Replace spaces with dashes
      .replace(/-+/g, '-');          // Deduplicate dashes
    setSlug(generated);
  }, [organizationName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Frontend validations
    if (!name || !email || !password || !confirmPassword || !organizationName || !slug) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      setErrorMsg('Slug must only contain lowercase letters, numbers, and dashes.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/signup', {
        name,
        email,
        password,
        organizationName,
        slug
      });

      setSuccessMsg('Workspace successfully initialized! Redirecting to login...');
      
      // Delay redirection to show success message
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Registration failure:', err);
      const message = err.response?.data?.error || err.message || 'Workspace provisioning failed.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 select-none">
      <div className="p-8 space-y-6">
        
        {/* Header Section */}
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
            <span>Create your workspace</span>
            <Sparkles className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Provision isolated multi-tenant ERP operations partition</p>
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

        {/* Success Alert Box */}
        {successMsg && (
          <div className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold leading-relaxed animate-in fade-in duration-200">
            <Sparkles className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              {successMsg}
            </div>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Nikhil Shrivastava"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="email" 
                  required
                  placeholder="e.g. nikhil@kaasvex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            {/* Organization Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wide">
                Organization Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Acme Corporation"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-medium"
                />
              </div>
            </div>

            {/* Workspace Subdomain Slug */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wide">
                Workspace ID / Slug *
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  required
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-mono"
                />
              </div>
              <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5 pl-1 leading-none">
                Lowercase letters, numbers, and dashes only
              </span>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wide">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-10 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-1 rounded-md transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wide">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg pl-10 pr-10 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all duration-200 placeholder:text-gray-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-1 rounded-md transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

          </div>

          {/* Submit Trigger Button */}
          <button 
            type="submit"
            disabled={submitting}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
            ) : null}
            <span>Provision Workspace</span>
          </button>

        </form>
      </div>

      {/* Footer link to sign up page */}
      <div className="px-8 py-4 bg-[#FAFABA]/10 dark:bg-slate-950/20 border-t border-[#EEEEEE] dark:border-slate-800 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
        Already have a workspace account?{' '}
        <Link href="/login" className="text-black dark:text-white font-bold hover:underline transition-all">
          Sign In
        </Link>
      </div>
    </div>
  );
}
