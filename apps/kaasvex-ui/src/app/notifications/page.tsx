"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Bell, 
  Settings, 
  Activity, 
  History, 
  Terminal, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Shuffle,
  ShieldCheck,
  Server,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';

interface NotificationSetting {
  id: string;
  event: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

interface NotificationLog {
  id: string;
  recipient: string;
  channel: string;
  event: string;
  status: string;
  content: string;
  errorMessage: string | null;
  latencyMs: number | null;
  brokerUsed: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'rules' | 'logs'>('telemetry');
  
  // Settings & Logs States
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [brokerMetrics, setBrokerMetrics] = useState<any>(null);
  const [brokerLogsList, setBrokerLogsList] = useState<string[]>([]);
  
  // Rule settings updates buffer
  const [rulesState, setRulesState] = useState<NotificationSetting[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  // Queue broker control
  const [changingBroker, setChangingBroker] = useState(false);

  // Manual test trigger inputs
  const [testEvent, setTestEvent] = useState('INVOICE_SENT');
  const [testRecipient, setTestRecipient] = useState('client@enterprise.com');
  const [testContent, setTestContent] = useState('Your invoice INV-202606-0089 for ₹42,500 has been dispatched.');
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Overdue dunning audit
  const [auditingOverdue, setAuditingOverdue] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');
  // Terminal scroll handler
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/notifications');
      setSettings(res.data.settings || []);
      setRulesState(JSON.parse(JSON.stringify(res.data.settings || [])));
      setLogs(res.data.logs || []);
      setBrokerMetrics(res.data.brokerMetrics);
      setBrokerLogsList(res.data.brokerLogs || []);
    } catch (err) {
      console.error('Failed to load notifications data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchData();
      
      // Set up polling for telemetry metrics & rolling terminal logs (every 2.5 seconds)
      const interval = setInterval(() => {
        fetchData(true);
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [activeOrganization, authLoading]);

  // Scroll to bottom of terminal whenever brokerLogsList updates
  useEffect(() => {
    if (activeTab === 'telemetry' && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [brokerLogsList, activeTab]);

  const handleBrokerChange = async (broker: 'KAFKA' | 'RABBITMQ' | 'AWS_SQS') => {
    if (brokerMetrics?.activeBroker === broker || changingBroker) return;
    
    setChangingBroker(true);
    try {
      await api.post('/notifications/change-broker', { broker });
      await fetchData(true);
    } catch (err) {
      console.error('Failed to change broker:', err);
      alert('Error switching queue broker integration.');
    } finally {
      setChangingBroker(false);
    }
  };

  const handleToggleChannel = (index: number, channel: 'emailEnabled' | 'smsEnabled' | 'whatsappEnabled' | 'pushEnabled' | 'inAppEnabled') => {
    const updated = [...rulesState];
    updated[index] = {
      ...updated[index],
      [channel]: !updated[index][channel]
    };
    setRulesState(updated);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSavedMessage('');
    try {
      await api.post('/notifications/settings', { settings: rulesState });
      await fetchData(true);
      setSettingsSavedMessage('Preferences applied successfully!');
      setTimeout(() => setSettingsSavedMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      alert('Failed to update communication channels.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDispatchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient || !testContent) {
      alert('Please fill out recipient and content.');
      return;
    }

    setSubmittingTest(true);
    setTestResult('');
    try {
      await api.post('/notifications/test', {
        event: testEvent,
        recipient: testRecipient,
        content: testContent
      });
      setTestResult('Dispatched to message broker queue.');
      // Auto switch back to telemetry if not active to watch logs
      if (activeTab !== 'telemetry') setActiveTab('telemetry');
      await fetchData(true);
      setTimeout(() => setTestResult(''), 3000);
    } catch (err) {
      console.error('Failed to dispatch test notification:', err);
      alert('Failed to stage test event.');
    } finally {
      setSubmittingTest(false);
    }
  };

  const handleRunDunningAudit = async () => {
    setAuditingOverdue(true);
    setAuditMessage('');
    try {
      const res = await api.post('/notifications/trigger-overdue');
      setAuditMessage(res.data.message);
      await fetchData(true);
      setTimeout(() => setAuditMessage(''), 5000);
    } catch (err) {
      console.error('Failed to execute dunning audit:', err);
      alert('Dunning audit simulation failed.');
    } finally {
      setAuditingOverdue(false);
    }
  };

  const formatEventName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD] dark:bg-slate-950 text-gray-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-black dark:text-white mb-3" />
        <span className="text-xs font-semibold font-mono tracking-wider uppercase text-gray-400">Loading Broker Telemetry...</span>
      </div>
    );
  }

  const activeBroker = brokerMetrics?.activeBroker || 'KAFKA';  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans">
      {/* Top Banner Header */}
      <header className="px-8 py-6 border-b border-[#EEEEEE] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Communication & Queue Manager</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Toggle communication triggers, configure asynchronous queue brokers, and monitor live telemetry.
          </p>
        </div>

        {/* Isolation indicator */}
        <div className="flex items-center gap-2 bg-[#F5F5F5] dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-500 dark:text-slate-400 shadow-2xs">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span>SCOPED: TENANT_WORKSPACE</span>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'telemetry' 
                ? 'border-black text-black dark:border-white dark:text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-500" />
            <span>Broker Telemetry Room</span>
          </button>
          
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'rules' 
                ? 'border-black text-black dark:border-white dark:text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 text-violet-500" />
            <span>Channel Delivery Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'logs' 
                ? 'border-black text-black dark:border-white dark:text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-teal-500" />
            <span>Transmission Logs History</span>
          </button>
        </div>

        {/* Tab 1: Broker Telemetry Room */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left & Middle: Broker Config + Stats + Layout + Terminal Logs (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Broker Switcher */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-gray-505" />
                    Select Queue System Broker
                  </h3>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Real-time simulator switch</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleBrokerChange('KAFKA')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeBroker === 'KAFKA'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Apache Kafka</span>
                  </button>

                  <button
                    onClick={() => handleBrokerChange('RABBITMQ')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeBroker === 'RABBITMQ'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>RabbitMQ</span>
                  </button>

                  <button
                    onClick={() => handleBrokerChange('AWS_SQS')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeBroker === 'AWS_SQS'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-955 dark:hover:text-white'
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    <span>AWS SQS</span>
                  </button>
                </div>
              </div>

              {/* KPI Metrics Dashboard Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Queued Messages</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{brokerMetrics?.queuedCount || 0}</span>
                    {brokerMetrics?.queuedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Active Workers</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{brokerMetrics?.processingCount || 0}</span>
                    {brokerMetrics?.processingCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Delivered</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{brokerMetrics?.sentCount || 0}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Failed</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className={`text-xl font-bold font-mono ${brokerMetrics?.failedCount > 0 ? 'text-red-500 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>{brokerMetrics?.failedCount || 0}</span>
                    <AlertTriangle className={`w-3.5 h-3.5 ${brokerMetrics?.failedCount > 0 ? 'text-red-500 dark:text-rose-455' : 'text-gray-400'}`} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Avg Latency</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{brokerMetrics?.avgLatencyMs || 0} ms</span>
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Dynamic Broker Architecture Visualizer */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                  Broker Internal Pipelines
                </h3>

                {activeBroker === 'KAFKA' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-[#EAEAEA] dark:border-slate-800">
                      <span>Topic: <strong className="font-mono text-black dark:text-white">notifications-topic</strong></span>
                      <span>Consumer Group: <strong className="font-mono text-black dark:text-white">group-kaasvex-notifications</strong></span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {brokerMetrics?.kafkaPartitions?.map((p: any) => (
                        <div key={p.id} className="border border-[#E5E5E5] dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between bg-white dark:bg-slate-900 relative overflow-hidden">
                          {p.lag > 0 && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-300 font-mono">Partition {p.id}</span>
                            <span className="text-[10px] bg-[#EFEFEF] dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-slate-400 font-mono">Offset: {p.offset}</span>
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-gray-400">Consumer Lag:</span>
                            <span className={`font-mono font-bold ${p.lag > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{p.lag} msg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-mono">
                      * Key-based partition routing is computed using recipient hash values: <span className="bg-gray-100 dark:bg-slate-800 px-1 py-0.5 rounded text-gray-700 dark:text-slate-300">Math.abs(hash(recipient)) % 3</span>. This ensures messages for the same client always execute sequentially.
                    </p>
                  </div>
                )}

                {activeBroker === 'RABBITMQ' && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center gap-4 bg-gray-55/40 dark:bg-slate-950/20 p-6 rounded-xl border border-[#EAEAEA] dark:border-slate-800">
                      <div className="bg-white dark:bg-slate-900 border border-[#DDD] dark:border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-mono">Topic Exchange</span>
                        <strong className="text-xs text-gray-900 dark:text-white mt-1 font-mono">notifications.exchange</strong>
                      </div>
                      
                      <div className="flex items-center justify-center text-gray-400 shrink-0">
                        <ArrowRight className="w-5 h-5 hidden md:block" />
                        <span className="text-[10px] font-mono rotate-90 md:rotate-0 my-1 md:my-0">r_key: notify.#</span>
                      </div>
 
                      <div className="bg-white dark:bg-slate-900 border border-black dark:border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center grow">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-mono">Durable Bound Queue</span>
                        <strong className="text-xs text-gray-900 dark:text-white mt-1 font-mono">q_kaasvex_notifications</strong>
                        <div className="mt-2 flex gap-4 text-[10px] font-mono border-t border-gray-100 dark:border-slate-800 pt-2 w-full justify-between">
                          <span className="text-gray-500">Unacked: <strong className="text-amber-500">{brokerMetrics?.rabbitmqQueues[0]?.messages || 0}</strong></span>
                          <span className="text-gray-500">ACKed: <strong className="text-emerald-500">{brokerMetrics?.rabbitmqQueues[0]?.acked || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono">
                      * Standard basicACK is issued on consumer callback triggers, providing robust delivery guarantees.
                    </p>
                  </div>
                )}
 
                {activeBroker === 'AWS_SQS' && (
                  <div className="space-y-4">
                    <div className="border border-[#E5E5E5] dark:border-slate-800 rounded-xl p-4 bg-[#FAFAFA] dark:bg-slate-950/20 space-y-3">
                      <div className="flex items-center justify-between text-xs border-b dark:border-slate-800 pb-2">
                        <span className="text-gray-400">Queue URL:</span>
                        <span className="font-mono text-black dark:text-white text-[10px] break-all max-w-[70%]">{brokerMetrics?.awsSqsQueues[0]?.queueUrl}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-2">
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-mono block">Messages Available</span>
                          <strong className="text-sm font-mono text-gray-900 dark:text-white">{brokerMetrics?.awsSqsQueues[0]?.messagesVisible || 0}</strong>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-mono block">Messages In Flight</span>
                          <strong className="text-sm font-mono text-gray-900 dark:text-white">{brokerMetrics?.awsSqsQueues[0]?.messagesFlight || 0}</strong>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800">
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-mono block">Visibility Timeout</span>
                          <strong className="text-sm font-mono text-gray-900 dark:text-white">{brokerMetrics?.awsSqsQueues[0]?.visibilityTimeout || 30}s</strong>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-800 flex flex-col justify-center">
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-mono block">FIFO Deduplication</span>
                          <strong className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">ENABLED</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rolling Terminal Logs */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-gray-605" />
                    Live Message Broker Logging daemon
                  </h3>
                  <button 
                    onClick={() => {
                      setBrokerLogsList(['[' + new Date().toISOString() + '] Terminal console logs buffer cleared by client.']);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Clear Terminal
                  </button>
                </div>
                
                {/* Terminal Console screen */}
                <div ref={terminalRef} className="h-64 rounded-xl bg-black border border-gray-800 dark:border-slate-800 p-4 font-mono text-xs text-green-400 overflow-y-auto space-y-1.5 scrollbar-thin shadow-inner select-text">
                  {brokerLogsList.length === 0 ? (
                    <div className="text-gray-505 italic text-[11px]">System standby. Waiting for message streams...</div>
                  ) : (
                    brokerLogsList.map((logLine, idx) => {
                      let textClass = 'text-green-400';
                      if (logLine.includes('[ERROR]')) textClass = 'text-rose-500 font-bold';
                      if (logLine.includes('[WARNING]')) textClass = 'text-amber-400';
                      if (logLine.includes('=== System requested')) textClass = 'text-cyan-400 font-bold';
                      return (
                        <div key={idx} className={`${textClass} leading-relaxed text-[11px]`}>
                          {logLine}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right Panel: Manual Ingress Test + Overdue reminders audit (1 col) */}
            <div className="space-y-6">
              
              {/* Manual Ingress test form */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-gray-605" />
                  Queue Custom Ingress Test
                </h3>
                <form onSubmit={handleDispatchTest} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Trigger Event Template</label>
                    <select
                      value={testEvent}
                      onChange={(e) => setTestEvent(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white font-semibold"
                    >
                      <option value="INVOICE_SENT">Invoice Sent (INVOICE_SENT)</option>
                      <option value="PAYMENT_RECEIVED">Payment Received (PAYMENT_RECEIVED)</option>
                      <option value="SUBSCRIPTION_RENEWAL">Subscription Renewal (SUBSCRIPTION_RENEWAL)</option>
                      <option value="OVERDUE_REMINDER">Overdue Reminder (OVERDUE_REMINDER)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Recipient Identifier</label>
                    <input
                      type="text"
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      placeholder="e.g. email@domain.com or phone number"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-505 dark:text-slate-400 font-semibold mb-1">Telemetry Message Content</label>
                    <textarea
                      rows={3}
                      value={testContent}
                      onChange={(e) => setTestContent(e.target.value)}
                      placeholder="Type custom text..."
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white resize-none text-gray-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTest}
                    className="w-full py-2 bg-black hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {submittingTest ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Stage into Queue</span>
                  </button>

                  {testResult && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg text-center font-mono text-[10px] animate-fade-in border border-transparent dark:border-emerald-900/60">
                      {testResult}
                    </div>
                  )}
                </form>
              </div>

              {/* Overdue Reminders triggers */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-gray-605" />
                  Overdue Accounts Reminders
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed mb-4">
                  Audit all active invoice records in this workspace, scan for past-due dates, update status locks to <strong>OVERDUE</strong>, and dispatch reminder dunning queues automatically.
                </p>

                <button
                  onClick={handleRunDunningAudit}
                  disabled={auditingOverdue}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {auditingOverdue ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>Scan Ledger & Send Reminders</span>
                </button>

                {auditMessage && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-400 rounded-lg text-center text-[10px] font-mono animate-fade-in font-medium">
                    {auditMessage}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Channel Delivery Rules */}
        {activeTab === 'rules' && (
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Communication Delivery matrix</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Specify which channel triggers to instantiate when event states transition.</p>
              </div>
              <div className="flex items-center gap-3">
                {settingsSavedMessage && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-fade-in">{settingsSavedMessage}</span>
                )}
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {savingSettings ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Settings className="w-3.5 h-3.5" />
                  )}
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Trigger Event Name</th>
                    <th className="px-6 py-4 text-center">Email</th>
                    <th className="px-6 py-4 text-center">SMS</th>
                    <th className="px-6 py-4 text-center">WhatsApp</th>
                    <th className="px-6 py-4 text-center">Push Notifications</th>
                    <th className="px-6 py-4 text-center">In-App Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
                  {rulesState.map((rule, idx) => (
                    <tr key={rule.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800 dark:text-slate-200 font-mono">
                        {formatEventName(rule.event)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.emailEnabled}
                          onChange={() => handleToggleChannel(idx, 'emailEnabled')}
                          className="w-4 h-4 rounded text-black dark:text-white border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-black dark:focus:ring-white cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.smsEnabled}
                          onChange={() => handleToggleChannel(idx, 'smsEnabled')}
                          className="w-4 h-4 rounded text-black dark:text-white border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-black dark:focus:ring-white cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.whatsappEnabled}
                          onChange={() => handleToggleChannel(idx, 'whatsappEnabled')}
                          className="w-4 h-4 rounded text-black dark:text-white border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-black dark:focus:ring-white cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.pushEnabled}
                          onChange={() => handleToggleChannel(idx, 'pushEnabled')}
                          className="w-4 h-4 rounded text-black dark:text-white border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-black dark:focus:ring-white cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={rule.inAppEnabled}
                          onChange={() => handleToggleChannel(idx, 'inAppEnabled')}
                          className="w-4 h-4 rounded text-black dark:text-white border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-black dark:focus:ring-white cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Historical Logs History */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Communication Audited ledger</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Audit log of all notification actions staged and processed by the system.</p>
              </div>
              <button
                onClick={() => fetchData(false)}
                className="p-1.5 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 rounded-lg text-gray-600 dark:text-slate-400 transition-colors"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {logs.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-500 italic font-medium">No communication logs recorded yet in this workspace.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Recipient</th>
                      <th className="px-6 py-4">Event trigger</th>
                      <th className="px-6 py-4">Channel</th>
                      <th className="px-6 py-4">Broker used</th>
                      <th className="px-6 py-4">Latency</th>
                      <th className="px-6 py-4">Delivery Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs font-mono">
                    {logs.map((log) => {
                      let statusBadge = 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400';
                      if (log.status === 'QUEUED') statusBadge = 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/60';
                      if (log.status === 'PROCESSING') statusBadge = 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60';
                      if (log.status === 'SENT') statusBadge = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60';
                      if (log.status === 'FAILED') statusBadge = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60';

                      return (
                        <tr key={log.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors text-[11px]">
                          <td className="px-6 py-4 text-gray-405 dark:text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-white truncate max-w-[150px]">
                            {log.recipient}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-slate-400 font-sans">
                            {formatEventName(log.event)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-[#F3F3F3] dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {log.channel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-550 dark:text-slate-400">
                            {log.brokerUsed}
                          </td>
                          <td className="px-6 py-4 text-gray-550 dark:text-slate-400">
                            {log.latencyMs ? `${log.latencyMs} ms` : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBadge}`}>
                              {log.status}
                            </span>
                            {log.errorMessage && (
                              <span className="block text-[9px] text-red-500 dark:text-rose-400 mt-1 truncate max-w-[180px]" title={log.errorMessage}>
                                {log.errorMessage}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
