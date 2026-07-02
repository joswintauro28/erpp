"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Shield, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Terminal, 
  Lock, 
  UserX, 
  DownloadCloud, 
  Play, 
  RefreshCw, 
  FileText, 
  Layers,
  Settings,
  ShieldCheck,
  Cpu,
  KeyRound
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  payloadHash: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function SecurityPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>({
    wafBlockedCount: 0,
    rateLimitThrottledCount: 0,
    activeKmsKey: 'kms-key-active-v1',
    kmsKeyLastRotated: new Date().toISOString()
  });
  const [securityLogsList, setSecurityLogsList] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Config Form States
  const [wafEnabled, setWafEnabled] = useState(true);
  const [rateLimitRpm, setRateLimitRpm] = useState(120);
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // KMS Rotation
  const [rotatingKeys, setRotatingKeys] = useState(false);

  // GDPR Actions
  const [selectedClientId, setSelectedClientId] = useState('');
  const [gdprActionStatus, setGdprActionStatus] = useState('');
  const [anonymizingClient, setAnonymizingClient] = useState(false);
  const [exportingClient, setExportingClient] = useState(false);

  // Simulator
  const [simulatingType, setSimulatingType] = useState<string | null>(null);

  // Terminal scroll target
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch security parameters & audit logs
      const res = await api.get('/security');
      setConfig(res.data.config);
      setAuditLogs(res.data.auditLogs || []);
      setTelemetry(res.data.telemetry);
      setSecurityLogsList(res.data.logsStream || []);
      
      if (res.data.config) {
        setWafEnabled(res.data.config.wafEnabled);
        setRateLimitRpm(res.data.config.rateLimitRpm);
        setIpWhitelist(res.data.config.ipWhitelist || '');
      }

      // Fetch client list for GDPR actions
      const clientsRes = await api.get('/clients');
      setClients(clientsRes.data.clients || []);
    } catch (err) {
      console.error('Failed to load security room details:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchData();

      // Set up polling for security logs and telemetry (every 3 seconds)
      const interval = setInterval(() => {
        fetchData(true);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [activeOrganization, authLoading]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [securityLogsList]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await api.post('/security/config', {
        wafEnabled,
        rateLimitRpm,
        ipWhitelist
      });
      await fetchData(true);
      alert('Security configurations successfully saved.');
    } catch (err) {
      console.error('Failed to save security configuration:', err);
      alert('Error saving firewall settings.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRotateKms = async () => {
    setRotatingKeys(true);
    try {
      const res = await api.post('/security/kms/rotate');
      await fetchData(true);
      alert(res.data.message);
    } catch (err) {
      console.error('KMS key rotation failed:', err);
      alert('Error executing key rotation.');
    } finally {
      setRotatingKeys(false);
    }
  };

  const handleAnonymizeClient = async () => {
    if (!selectedClientId) {
      alert('Please select a client to scrub.');
      return;
    }
    const client = clients.find(c => c.id === selectedClientId);
    if (!confirm(`WARNING: This is a permanent GDPR "Right to be Forgotten" scrub for client "${client?.name || selectedClientId}". All billing details, personal info, and contact cards will be irreversibly anonymized in system logs. Do you wish to continue?`)) return;

    setAnonymizingClient(true);
    setGdprActionStatus('');
    try {
      const res = await api.post('/security/gdpr/anonymize', { clientId: selectedClientId });
      setGdprActionStatus(res.data.message);
      setSelectedClientId('');
      await fetchData(true);
      setTimeout(() => setGdprActionStatus(''), 3000);
    } catch (err: any) {
      console.error('Client anonymize failed:', err);
      alert(err.response?.data?.error || 'Scrub request failed.');
    } finally {
      setAnonymizingClient(false);
    }
  };

  const handleExportClient = async () => {
    if (!selectedClientId) {
      alert('Please select a client to export.');
      return;
    }

    setExportingClient(true);
    setGdprActionStatus('');
    try {
      const res = await api.post('/security/gdpr/export', { clientId: selectedClientId });
      
      // Trigger a JSON file download in browser
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `gdpr_data_export_${selectedClientId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setGdprActionStatus('GDPR data export successfully downloaded.');
      setTimeout(() => setGdprActionStatus(''), 3000);
    } catch (err: any) {
      console.error('Client data export failed:', err);
      alert(err.response?.data?.error || 'Data export failed.');
    } finally {
      setExportingClient(false);
    }
  };

  const handleSimulateAttack = async (type: 'SQL_INJECTION' | 'XSS' | 'RATE_LIMIT') => {
    setSimulatingType(type);
    try {
      await api.post('/security/simulate-attack', { type });
      setTimeout(async () => {
        await fetchData(true);
        setSimulatingType(null);
      }, 800);
    } catch (err) {
      console.error('Attack simulation failed:', err);
      setSimulatingType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD] dark:bg-slate-950 text-gray-550 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-black dark:text-white mb-3" />
        <span className="text-xs font-semibold font-mono tracking-wider uppercase text-gray-400 dark:text-slate-500">Loading Security Vault...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-gray-900 dark:text-white font-sans">
      
      {/* Header */}
      <header className="px-8 py-6 border-b border-[#EEEEEE] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-black dark:bg-slate-950 text-white rounded-lg border dark:border-slate-800">
              <Shield className="w-5 h-5 text-rose-500" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">Security Control & SOC2 Audit</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Audit general ledger mutations, rotate KMS master keys, trigger GDPR right-to-be-forgotten scripts, and monitor WAF activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-450 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>SOC2: READY</span>
          </div>
          <div className="flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/50 text-cyan-800 dark:text-cyan-455 text-[10px] font-bold px-3 py-1.5 rounded-lg font-mono">
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
            <span>GDPR: COMPLIANT</span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Telemetry Dials */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Active KMS Key</span>
            <div className="mt-2">
              <span className="text-sm font-bold font-mono text-gray-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                {telemetry.activeKmsKey}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">KMS Last Rotated</span>
            <div className="mt-2">
              <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">
                {new Date(telemetry.kmsKeyLastRotated).toLocaleDateString()} {new Date(telemetry.kmsKeyLastRotated).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">WAF Intercepts</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${telemetry.wafBlockedCount > 0 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                {telemetry.wafBlockedCount}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-455">blocks</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Rate Limit Triggers</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${telemetry.rateLimitThrottledCount > 0 ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
                {telemetry.rateLimitThrottledCount}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-455">throttles</span>
            </div>
          </div>
        </div>

        {/* Configurations Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls & Tools Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* WAF & Rate Limiting form */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
              <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-gray-500" />
                Firewall & Shield Policies
              </h3>
              
              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 border border-gray-150 dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-850/50">
                  <div className="space-y-0.5">
                    <strong className="text-gray-900 dark:text-slate-200 font-sans block">Web Application Firewall (WAF) Guard</strong>
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 font-mono">Filters body/query params against SQL Injection and XSS strings</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWafEnabled(!wafEnabled)}
                    className="focus:outline-none"
                  >
                    {wafEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50 font-sans text-[10px] font-bold">
                        ENABLED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 font-sans text-[10px] font-bold">
                        DISABLED
                      </span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Rate Limit Cap (RPM)</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="1000"
                      value={rateLimitRpm}
                      onChange={(e) => setRateLimitRpm(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-650"
                    />
                    <span className="text-[9px] text-gray-400 dark:text-slate-450 block mt-1 font-mono">Maximum requests per minute per IP</span>
                  </div>

                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Allowed IP Address Whitelist</label>
                    <input
                      type="text"
                      value={ipWhitelist}
                      onChange={(e) => setIpWhitelist(e.target.value)}
                      placeholder="e.g. 127.0.0.1, 192.168.1.10"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-650"
                    />
                    <span className="text-[9px] text-gray-400 dark:text-slate-455 block mt-1 font-mono">Comma-separated address vectors</span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="bg-black dark:bg-slate-850 border border-transparent dark:border-slate-750 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {savingConfig && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Security Rules</span>
                  </button>
                </div>
              </form>
            </div>

            {/* GDPR right to be forgotten card */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-gray-500" />
                  GDPR compliance console
                </h3>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-mono mt-1">
                  Enforce data privacy rights: scrub personal data structures or export JSON portfolios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Select Client Workspace</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-650"
                  >
                    <option value="" className="dark:bg-slate-900">-- Choose Client Profile --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2.5">
                  <button
                    onClick={handleExportClient}
                    disabled={exportingClient || anonymizingClient || !selectedClientId}
                    className="flex-1 py-2 px-3 border border-gray-255 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    title="Right to Portability data download"
                  >
                    {exportingClient ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black dark:text-white" />
                    ) : (
                      <DownloadCloud className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                    )}
                    <span>GDPR Export</span>
                  </button>

                  <button
                    onClick={handleAnonymizeClient}
                    disabled={anonymizingClient || exportingClient || !selectedClientId}
                    className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Right to be Forgotten scrub"
                  >
                    {anonymizingClient ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <UserX className="w-3.5 h-3.5" />
                    )}
                    <span>Scrub Data</span>
                  </button>
                </div>
              </div>

              {gdprActionStatus && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-450 text-center font-mono text-[10px] font-semibold rounded-lg animate-fade-in">
                  {gdprActionStatus}
                </div>
              )}
            </div>

          </div>

          {/* KMS rotation and logs column */}
          <div className="space-y-6">
            
            {/* KMS Cryptographic Keys */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-rose-500 animate-pulse" />
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                  KMS Cryptographic Keys
                </h3>
              </div>
              <p className="text-[11px] text-gray-550 dark:text-slate-400 leading-relaxed">
                Kaasvex utilizes AES-256 envelope encryption. Rotate the master encryption key regularly to re-key audit database vectors automatically.
              </p>

              <button
                onClick={handleRotateKms}
                disabled={rotatingKeys}
                className="w-full py-2.5 bg-black dark:bg-slate-800 border border-transparent dark:border-slate-705 text-white hover:bg-gray-800 dark:hover:bg-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {rotatingKeys ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCw className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Rotate KMS Master Keys</span>
              </button>
            </div>

            {/* WAF Live logs */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
                  WAF Intercept Telemetry Console
                </h3>
                <button
                  onClick={() => setSecurityLogsList([])}
                  className="text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>

              <div ref={terminalRef} className="h-64 rounded-xl bg-black border border-gray-900 dark:border-slate-850 p-4 font-mono text-[10px] text-green-400 overflow-y-auto space-y-1.5 scrollbar-thin shadow-inner select-text">
                {securityLogsList.length === 0 ? (
                  <div className="text-gray-600 dark:text-slate-500 italic text-center py-12">Listening for WAF packet hooks...</div>
                ) : (
                  securityLogsList.map((logLine, idx) => {
                    let textClass = 'text-green-400';
                    if (logLine.includes('[WAF Block]') || logLine.includes('[Rate Limiter]')) textClass = 'text-rose-500 font-bold animate-pulse';
                    if (logLine.includes('[Audit Log]')) textClass = 'text-cyan-400';
                    if (logLine.includes('[KMS]')) textClass = 'text-amber-400 font-bold';
                    return (
                      <div key={idx} className={`${textClass} leading-relaxed break-words`}>
                        {logLine}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Simulation triggers */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  onClick={() => handleSimulateAttack('SQL_INJECTION')}
                  disabled={simulatingType !== null}
                  className="py-1.5 px-2 bg-gray-55/40 dark:bg-slate-850/50 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-[10px] font-bold text-gray-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Simulate SQLi attack vector"
                >
                  <Play className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>SQLi</span>
                </button>

                <button
                  onClick={() => handleSimulateAttack('XSS')}
                  disabled={simulatingType !== null}
                  className="py-1.5 px-2 bg-gray-55/40 dark:bg-slate-850/50 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-[10px] font-bold text-gray-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Simulate XSS attack vector"
                >
                  <Play className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>XSS</span>
                </button>

                <button
                  onClick={() => handleSimulateAttack('RATE_LIMIT')}
                  disabled={simulatingType !== null}
                  className="py-1.5 px-2 bg-gray-55/40 dark:bg-slate-850/50 border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-[10px] font-bold text-gray-700 dark:text-slate-200 flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  title="Simulate request throttling flood"
                >
                  <Play className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>Flood</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* SOC2 Audit Log Ledger */}
        <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-500" />
                SOC2-Ready System Audit Trails
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Cryptographically hashed audit log ledger showing compliance audits and security mutations.
              </p>
            </div>
            <button
              onClick={() => fetchData(false)}
              className="p-1.5 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 text-gray-600 dark:text-slate-350 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-550 italic">
                No audit logs compiled in this workspace yet. Execute actions or rotate keys to view audit rows.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-55/50 dark:bg-slate-850/50 border-b border-gray-100 dark:border-slate-850 text-[10px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider">
                    <th className="px-6 py-4">Action Event</th>
                    <th className="px-6 py-4">Resource Target</th>
                    <th className="px-6 py-4">Client IP</th>
                    <th className="px-6 py-4">User Agent / Client</th>
                    <th className="px-6 py-4 text-center">Device</th>
                    <th className="px-6 py-4">SHA-256 Log Checksum Signature</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[11px] font-mono">
                  {auditLogs.map((log) => {
                    let actionBadge = 'bg-gray-100 text-gray-700';
                    if (log.action === 'KEY_ROTATION') actionBadge = 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-455 border border-amber-100 dark:border-amber-900/50';
                    if (log.action === 'GDPR_ANONYMIZE') actionBadge = 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-455 border border-rose-100 dark:border-rose-900/50';
                    if (log.action === 'GDPR_DATA_EXPORT') actionBadge = 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-455 border border-cyan-100 dark:border-cyan-900/50';
                    if (log.action === 'BLOCKED_ATTACK') actionBadge = 'bg-rose-600 text-white font-bold animate-pulse';
                    if (log.action === 'SECURITY_CONFIG_UPDATE') actionBadge = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50';

                    return (
                      <tr key={log.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4 font-bold font-sans">
                          <span className={`px-2 py-0.5 rounded text-[9px] ${actionBadge}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white font-sans max-w-[150px] truncate" title={log.resource || ''}>
                          {log.resource || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 text-gray-400 dark:text-slate-500 truncate max-w-[140px]" title={log.userAgent || ''}>
                          {log.userAgent}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500 dark:text-slate-400 font-sans">
                          {log.deviceType}
                        </td>
                        <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          {log.payloadHash ? `${log.payloadHash.substring(0, 16)}...` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 dark:text-slate-500 font-sans">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
