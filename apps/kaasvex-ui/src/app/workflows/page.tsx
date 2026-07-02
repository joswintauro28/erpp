"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Zap,
  Play,
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Settings,
  X,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface WorkflowLog {
  id: string;
  workflowId: string;
  status: 'SUCCESS' | 'FAILED';
  triggerEvent: string;
  executionDetails: string;
  errorMessage: string | null;
  createdAt: string;
  workflow: {
    name: string;
  } | null;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: 'INVOICE_UNPAID' | 'PAYMENT_RECEIVED' | 'GST_DUE';
  triggerConditions: string; // stringified JSON
  actionType: 'SEND_REMINDER' | 'UPDATE_LEDGER' | 'NOTIFY_ACCOUNTANT';
  actionConfig: string; // stringified JSON
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logs: any[];
}

export default function WorkflowsPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executionLogs, setExecutionLogs] = useState<WorkflowLog[]>([]);
  const [telemetry, setTelemetry] = useState<any>({
    activeRulesCount: 0,
    totalRunsCount: 0,
    successRunsCount: 0,
    failedRunsCount: 0
  });
  const [logsStreamList, setLogsStreamList] = useState<string[]>([]);
  const [simulatingType, setSimulatingType] = useState<string | null>(null);

  // Form states for creating a new workflow
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'INVOICE_UNPAID' | 'PAYMENT_RECEIVED' | 'GST_DUE'>('INVOICE_UNPAID');
  
  // Trigger Conditions
  const [unpaidDays, setUnpaidDays] = useState(7);
  
  // Action Configuration
  const [actionType, setActionType] = useState<'SEND_REMINDER' | 'UPDATE_LEDGER' | 'NOTIFY_ACCOUNTANT'>('SEND_REMINDER');
  const [reminderChannel, setReminderChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [recipient, setRecipient] = useState('client@kaasvex.io');
  const [reminderContent, setReminderContent] = useState('Your invoice payment is overdue. Please settle as soon as possible.');
  const [debitAccount, setDebitAccount] = useState('1010'); // Cash
  const [creditAccount, setCreditAccount] = useState('4000'); // Sales Revenue
  const [savingRule, setSavingRule] = useState(false);

  // Terminal scroll target
  const terminalRef = useRef<HTMLDivElement>(null);

  // Fetch telemetry, workflows, and log data
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/workflows');
      setWorkflows(res.data.workflows || []);
      setExecutionLogs(res.data.logs || []);
      setTelemetry(res.data.telemetry || {
        activeRulesCount: 0,
        totalRunsCount: 0,
        successRunsCount: 0,
        failedRunsCount: 0
      });
      setLogsStreamList(res.data.logsStream || []);
    } catch (err) {
      console.error('Failed to fetch workflows data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchData();

      // Polling event bus diagnostic logs & telemetry counters every 3 seconds
      const interval = setInterval(() => {
        fetchData(true);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [activeOrganization, authLoading]);

  // Update action selection options when trigger type changes to keep logical pairs
  useEffect(() => {
    if (triggerType === 'INVOICE_UNPAID') {
      setActionType('SEND_REMINDER');
      setRecipient('client@kaasvex.io');
      setReminderContent('Your invoice payment is overdue. Please settle as soon as possible.');
    } else if (triggerType === 'PAYMENT_RECEIVED') {
      setActionType('UPDATE_LEDGER');
      setDebitAccount('1010');
      setCreditAccount('4000');
    } else if (triggerType === 'GST_DUE') {
      setActionType('NOTIFY_ACCOUNTANT');
      setRecipient('accountant@kaasvex.io');
      setReminderContent('GST filing cycle needs review. Audit ledger files.');
    }
  }, [triggerType]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logsStreamList]);

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await api.post('/workflows/toggle', { id, isActive: !currentActive });
      await fetchData(true);
    } catch (err) {
      console.error('Failed to toggle workflow rule active status:', err);
      alert('Error updating workflow status.');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this automation rule?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      await fetchData(true);
    } catch (err) {
      console.error('Failed to delete workflow rule:', err);
      alert('Error deleting workflow rule.');
    }
  };

  const handleCreateRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) {
      alert('Please provide a name for this rule.');
      return;
    }

    setSavingRule(true);
    
    // Construct triggers conditions JSON
    const triggerConditions: any = {};
    if (triggerType === 'INVOICE_UNPAID') {
      triggerConditions.unpaidDays = Number(unpaidDays);
    }

    // Construct action configurations JSON
    const actionConfig: any = {};
    if (actionType === 'SEND_REMINDER') {
      actionConfig.channel = reminderChannel;
      actionConfig.recipient = recipient;
      actionConfig.content = reminderContent;
    } else if (actionType === 'UPDATE_LEDGER') {
      actionConfig.debitAccount = debitAccount;
      actionConfig.creditAccount = creditAccount;
    } else if (actionType === 'NOTIFY_ACCOUNTANT') {
      actionConfig.recipient = recipient;
      actionConfig.content = reminderContent;
    }

    try {
      await api.post('/workflows', {
        name: ruleName,
        description: ruleDescription,
        triggerType,
        triggerConditions,
        actionType,
        actionConfig,
        isActive: true
      });

      // Reset form states
      setRuleName('');
      setRuleDescription('');
      setShowCreateForm(false);
      await fetchData(true);
    } catch (err) {
      console.error('Failed to save workflow automation rule:', err);
      alert('Error saving workflow rule configuration.');
    } finally {
      setSavingRule(false);
    }
  };

  const handleSimulateEvent = async (type: 'INVOICE_UNPAID' | 'PAYMENT_RECEIVED' | 'GST_DUE') => {
    setSimulatingType(type);
    try {
      await api.post('/workflows/simulate', { triggerType: type });
      // Short delay to let the event propagate and logs load
      setTimeout(async () => {
        await fetchData(true);
        setSimulatingType(null);
      }, 800);
    } catch (err) {
      console.error('Simulation invocation failed:', err);
      setSimulatingType(null);
      alert('Failed to invoke event bus simulation.');
    }
  };

  const parseJsonSafe = (jsonStr: string, key: string, fallback = '') => {
    try {
      const obj = JSON.parse(jsonStr);
      return obj[key] || fallback;
    } catch {
      return fallback;
    }
  };

  const formatTriggerDesc = (trigger: string, conditions: string) => {
    if (trigger === 'INVOICE_UNPAID') {
      const days = parseJsonSafe(conditions, 'unpaidDays', '7');
      return `IF Invoice remains unpaid for >= ${days} days`;
    }
    if (trigger === 'PAYMENT_RECEIVED') {
      return `IF Payment is successfully received`;
    }
    if (trigger === 'GST_DUE') {
      return `IF GST filing date matches audit window`;
    }
    return trigger;
  };

  const formatActionDesc = (action: string, config: string) => {
    if (action === 'SEND_REMINDER') {
      const ch = parseJsonSafe(config, 'channel', 'EMAIL');
      const rec = parseJsonSafe(config, 'recipient', 'client@kaasvex.io');
      return `THEN Send Reminder via ${ch} to ${rec}`;
    }
    if (action === 'UPDATE_LEDGER') {
      const dr = parseJsonSafe(config, 'debitAccount', '1010');
      const cr = parseJsonSafe(config, 'creditAccount', '4000');
      return `THEN Post Journal (Debit Account ${dr} / Credit Account ${cr})`;
    }
    if (action === 'NOTIFY_ACCOUNTANT') {
      const rec = parseJsonSafe(config, 'recipient', 'accountant@kaasvex.io');
      return `THEN Notify Accountant at ${rec}`;
    }
    return action;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD] dark:bg-slate-950 text-gray-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-black dark:text-white mb-3" />
        <span className="text-xs font-semibold font-mono tracking-wider uppercase text-gray-400 dark:text-slate-500">Loading Automation Engine...</span>
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
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">ERP Workflow Rules Engine</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Build custom trigger-action automations, model Zapier logic, synchronize double-entry journals, and audit event logs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-black dark:bg-slate-800 dark:border dark:border-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Automation</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Active Rules</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{telemetry.activeRulesCount}</span>
              <span className="text-[10px] font-bold text-emerald-650 dark:text-emerald-450">evaluating</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Total Runs</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{telemetry.totalRunsCount}</span>
              <span className="text-[10px] text-gray-400 dark:text-slate-455">executions</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Success Runs</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{telemetry.successRunsCount}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                {telemetry.totalRunsCount > 0 
                  ? `${Math.round((telemetry.successRunsCount / telemetry.totalRunsCount) * 100)}%` 
                  : '100%'}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">Failed Runs</span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold font-mono ${telemetry.failedRunsCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-gray-900 dark:text-white'}`}>
                {telemetry.failedRunsCount}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-455">errors</span>
            </div>
          </div>
        </div>

        {/* Rule Builder Panel (conditional modal-like drawer overlay) */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
              <div className="px-6 py-4 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-black dark:bg-slate-950 text-white rounded">
                    <Zap className="w-4.5 h-4.5" />
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white font-sans">ERP Automation builder</h3>
                </div>
                <button 
                  onClick={() => setShowCreateForm(false)} 
                  className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateRuleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Rule Basic Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Rule Name</label>
                    <input
                      type="text"
                      required
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="e.g. Overdue Invoice Reminders"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Description</label>
                    <input
                      type="text"
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                      placeholder="e.g. Notify clients when invoice is late"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                    />
                  </div>
                </div>

                <div className="h-px bg-gray-150 dark:bg-slate-800 my-2" />

                {/* IF Trigger Configuration */}
                <div className="bg-gray-55/40 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800 p-4 rounded-xl space-y-3">
                  <span className="text-[10px] font-extrabold text-black dark:text-white font-mono tracking-wider uppercase bg-[#EAEAEA] dark:bg-slate-800 px-2 py-0.5 rounded">
                    IF: Trigger Condition
                  </span>

                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Select Trigger Event</label>
                    <select
                      value={triggerType}
                      onChange={(e) => setTriggerType(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                    >
                      <option value="INVOICE_UNPAID">IF Invoice remains unpaid</option>
                      <option value="PAYMENT_RECEIVED">IF Payment is successfully received</option>
                      <option value="GST_DUE">IF GST filing cycle deadline approaches</option>
                    </select>
                  </div>

                  {triggerType === 'INVOICE_UNPAID' && (
                    <div className="animate-fade-in">
                      <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Overdue Age Days threshold</label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={unpaidDays}
                        onChange={(e) => setUnpaidDays(Number(e.target.value))}
                        className="w-32 bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                      />
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1 font-mono">
                        Rule triggers when invoice date exceeds this number of days without payment.
                      </span>
                    </div>
                  )}

                  {triggerType === 'PAYMENT_RECEIVED' && (
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono italic animate-fade-in">
                      Rule fires automatically on any successful payment transaction posted to the system.
                    </div>
                  )}

                  {triggerType === 'GST_DUE' && (
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono italic animate-fade-in">
                      Rule triggers dynamically when compliance files indicate active filing deadlines (within 5 days).
                    </div>
                  )}
                </div>

                {/* THEN Action Configuration */}
                <div className="bg-gray-55/40 dark:bg-slate-850/40 border border-gray-150 dark:border-slate-800 p-4 rounded-xl space-y-3">
                  <span className="text-[10px] font-extrabold text-black dark:text-white font-mono tracking-wider uppercase bg-[#EAEAEA] dark:bg-slate-800 px-2 py-0.5 rounded">
                    THEN: Action Execution
                  </span>

                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Select Trigger Outcome</label>
                    <select
                      value={actionType}
                      disabled
                      className="w-full bg-gray-100 dark:bg-slate-850 border border-[#E5E5E5] dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 focus:outline-none"
                    >
                      {triggerType === 'INVOICE_UNPAID' && <option value="SEND_REMINDER" className="dark:bg-slate-900">THEN Send overdue reminder notification</option>}
                      {triggerType === 'PAYMENT_RECEIVED' && <option value="UPDATE_LEDGER" className="dark:bg-slate-900">THEN Update general ledger journal entries</option>}
                      {triggerType === 'GST_DUE' && <option value="NOTIFY_ACCOUNTANT" className="dark:bg-slate-900">THEN Notify accountant via in-app alert</option>}
                    </select>
                  </div>

                  {actionType === 'SEND_REMINDER' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Reminder Channel</label>
                          <select
                            value={reminderChannel}
                            onChange={(e) => setReminderChannel(e.target.value as any)}
                            className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-850 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                          >
                            <option value="EMAIL" className="dark:bg-slate-900">Email</option>
                            <option value="SMS" className="dark:bg-slate-900">SMS Message</option>
                            <option value="WHATSAPP" className="dark:bg-slate-900">WhatsApp Message</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Recipient Address</label>
                          <input
                            type="text"
                            required
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="e.g. client@email.com"
                            className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-850 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Reminder Message Body</label>
                        <textarea
                          rows={2}
                          value={reminderContent}
                          onChange={(e) => setReminderContent(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-850 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                        />
                      </div>
                    </div>
                  )}

                  {actionType === 'UPDATE_LEDGER' && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      <div>
                        <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Debit Account (Increase)</label>
                        <select
                          value={debitAccount}
                          onChange={(e) => setDebitAccount(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-855 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                        >
                          <option value="1010" className="dark:bg-slate-900">1010 - Cash Account</option>
                          <option value="1200" className="dark:bg-slate-900">1200 - Accounts Receivable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Credit Account (Increase)</label>
                        <select
                          value={creditAccount}
                          onChange={(e) => setCreditAccount(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-855 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                        >
                          <option value="4000" className="dark:bg-slate-900">4000 - Sales Revenue</option>
                          <option value="2000" className="dark:bg-slate-900">2000 - Accounts Payable</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {actionType === 'NOTIFY_ACCOUNTANT' && (
                    <div className="space-y-3 animate-fade-in">
                      <div>
                        <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Accountant Email</label>
                        <input
                          type="email"
                          required
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="e.g. accountant@company.com"
                          className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-855 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-500 dark:text-slate-400 font-bold mb-1">Compliance Alert text</label>
                        <textarea
                          rows={2}
                          value={reminderContent}
                          onChange={(e) => setReminderContent(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-855 dark:text-white focus:outline-none focus:border-black dark:focus:border-slate-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg font-bold text-gray-600 dark:text-slate-350 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRule}
                    className="px-4 py-2 bg-black dark:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {savingRule ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>Save Automation Rule</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Builder Main Grid workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Rules List (Left 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Automations Rules Grid */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-gray-500" />
                    Configured ERP Rules
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Manage active conditional triggers evaluating on the central Event Bus.
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
                {workflows.length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-550 italic">
                    No automation rules registered yet. Click "Create Automation" above.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-55/50 dark:bg-slate-850/50 border-b border-gray-100 dark:border-slate-850 text-[10px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider">
                        <th className="px-6 py-4">Rule Details</th>
                        <th className="px-6 py-4">IF: Trigger Condition</th>
                        <th className="px-6 py-4">THEN: Action Config</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[11px] font-mono">
                      {workflows.map((flow) => (
                        <tr key={flow.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-850/20 transition-colors">
                          <td className="px-6 py-4 font-sans max-w-[150px]">
                            <strong className="text-gray-900 dark:text-white block truncate">{flow.name}</strong>
                            <span className="text-[10px] text-gray-400 dark:text-slate-450 block truncate">{flow.description || 'No desc.'}</span>
                          </td>
                          
                          <td className="px-6 py-4 text-amber-600 dark:text-amber-400 font-bold max-w-[200px] truncate">
                            {formatTriggerDesc(flow.triggerType, flow.triggerConditions)}
                          </td>

                          <td className="px-6 py-4 text-violet-600 dark:text-violet-400 font-bold max-w-[200px] truncate">
                            {formatActionDesc(flow.actionType, flow.actionConfig)}
                          </td>

                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleActive(flow.id, flow.isActive)}
                              className="focus:outline-none hover:opacity-80 transition-opacity inline-block"
                              title="Toggle rule status"
                            >
                              {flow.isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50 font-sans text-[10px] font-bold">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                  ACTIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 font-sans text-[10px] font-bold">
                                  INACTIVE
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="px-6 py-4 text-right font-sans">
                            <button
                              onClick={() => handleDeleteRule(flow.id)}
                              className="p-1 border border-gray-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-900/50 hover:text-red-500 text-gray-400 dark:text-slate-500 rounded transition-colors"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Flat Run Audit history */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-gray-500 dark:text-slate-400 animate-pulse" />
                  Automation Execution Logs (Event Audit)
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Historical general ledger postings, email dispatch queues, and rules evaluates.
                </p>
              </div>

              <div className="overflow-x-auto">
                {executionLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-550 italic">
                    No runs recorded yet. Use the event bus simulator to trigger rules.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-55/50 dark:bg-slate-850/50 border-b border-gray-100 dark:border-slate-850 text-[10px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider">
                        <th className="px-6 py-4">Trigger Event</th>
                        <th className="px-6 py-4">Rule Name</th>
                        <th className="px-6 py-4">Execution Outcome</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-[11px] font-mono">
                      {executionLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-850/20 transition-colors">
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium font-sans truncate max-w-[200px]">
                            {log.triggerEvent}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-slate-455 truncate max-w-[120px]">
                            {log.workflow?.name || 'Deleted Rule'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-slate-350 truncate max-w-[250px]" title={log.executionDetails}>
                            {log.status === 'FAILED' ? (
                              <span className="text-rose-500 dark:text-rose-400 font-bold">{log.errorMessage || 'Execution interrupted'}</span>
                            ) : (
                              log.executionDetails
                            )}
                          </td>
                          <td className="px-6 py-4 text-center font-sans">
                            {log.status === 'SUCCESS' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50 font-sans text-[9px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                SUCCESS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-455 border border-rose-100 dark:border-rose-900/50 font-sans text-[9px] font-bold">
                                <XCircle className="w-3 h-3" />
                                FAILED
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-400 dark:text-slate-500 font-sans">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>

          {/* Event Bus Simulator Terminal Console (Right 1 column) */}
          <div className="space-y-6">
            
            {/* Simulation Dispatch Cards */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-1.5">
                <Play className="w-4 h-4 text-emerald-600 animate-pulse" />
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider">
                  Event Bus Simulator
                </h3>
              </div>
              <p className="text-[11px] text-gray-550 dark:text-slate-400 leading-relaxed">
                Dispatch mock business lifecycle events to test configured rule actions and double-entry postings instantly.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleSimulateEvent('INVOICE_UNPAID')}
                  disabled={simulatingType !== null}
                  className="w-full py-2 px-3 border border-[#E5E5E5] dark:border-slate-800 bg-gray-50 dark:bg-slate-850 hover:bg-[#F0F0F0] dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-between text-gray-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>Unpaid Invoice (7 Days)</span>
                  </span>
                  <Play className="w-3.5 h-3.5 text-gray-400" />
                </button>

                <button
                  onClick={() => handleSimulateEvent('PAYMENT_RECEIVED')}
                  disabled={simulatingType !== null}
                  className="w-full py-2 px-3 border border-[#E5E5E5] dark:border-slate-800 bg-gray-50 dark:bg-slate-850 hover:bg-[#F0F0F0] dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-between text-gray-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                    <span>Payment Received (₹15k)</span>
                  </span>
                  <Play className="w-3.5 h-3.5 text-gray-400" />
                </button>

                <button
                  onClick={() => handleSimulateEvent('GST_DUE')}
                  disabled={simulatingType !== null}
                  className="w-full py-2 px-3 border border-[#E5E5E5] dark:border-slate-800 bg-gray-50 dark:bg-slate-850 hover:bg-[#F0F0F0] dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center justify-between text-gray-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-rose-500" />
                    <span>GST Deadline Imminent</span>
                  </span>
                  <Play className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Rolling Logs Console */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Bus Diagnostics Console
                </h3>
                <button
                  onClick={() => setLogsStreamList([])}
                  className="text-[10px] font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>

              <div ref={terminalRef} className="h-72 rounded-xl bg-black border border-gray-900 dark:border-slate-850 p-4 font-mono text-[10px] text-green-400 overflow-y-auto space-y-1.5 scrollbar-thin shadow-inner select-text">
                {logsStreamList.length === 0 ? (
                  <div className="text-gray-600 dark:text-slate-500 italic text-center py-12">Listening for Event Bus telemetry...</div>
                ) : (
                  logsStreamList.map((logLine, idx) => {
                    let textClass = 'text-green-400';
                    if (logLine.includes('[CRITICAL ERROR]') || logLine.includes('[Action Error]')) textClass = 'text-rose-500 font-bold';
                    if (logLine.includes('[WARNING]')) textClass = 'text-amber-400';
                    if (logLine.includes('[Event Bus]')) textClass = 'text-cyan-400 font-bold';
                    if (logLine.includes('[Rule Evaluation]')) textClass = 'text-amber-500';
                    if (logLine.includes('[Action Success]')) textClass = 'text-emerald-400';
                    return (
                      <div key={idx} className={`${textClass} leading-relaxed break-words`}>
                        {logLine}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick How-To Card */}
            <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
              <h4 className="text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                Ledger Integration Note
              </h4>
              <p className="text-[11px] text-gray-550 dark:text-slate-400 leading-relaxed">
                Rules executing <strong>THEN Update ledger journal entries</strong> generate atomic double-entry bookkeeping transactions. These update the Asset/Liability balances directly in the General Ledger (Module 8) and can be audited in the ledger dashboard.
              </p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
