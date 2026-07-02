"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  Plus, 
  Activity, 
  Compass, 
  HelpCircle, 
  Lightbulb,
  X,
  Building2,
  DollarSign,
  TrendingDown,
  Layers,
  Bot,
  Smartphone,
  Check,
  RefreshCw,
  Play,
  FileCode,
  Upload,
  ShieldAlert,
  MessageSquare,
  Calendar,
  CreditCard,
  Users
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';

// High-fidelity fallback metrics
const FALLBACK_STATS = {
  healthScore: 78,
  cashBalance: 491000,
  receivablesBalance: 66000,
  netProfitMargin: 23.5,
  runwayMonths: 9.8,
  totalRevenue: 75000,
  totalExpenses: 12000,
  netProfit: 63000,
  mrr: 15000
};

const FALLBACK_INSIGHTS = [
  {
    id: 'insight-runway',
    title: 'Optimized Liquidity: Safe Runway Range',
    category: 'CASH_FLOW',
    description: 'Your estimated cash runway is currently 9.8 months. This is safe, but consider reducing SaaS spend to maintain a perfect 12+ months threshold.',
    impact: 'MEDIUM',
    actionText: 'Optimize SaaS Bills',
    actionLink: '/expenses'
  },
  {
    id: 'insight-overdue',
    title: 'High Collection Risk: Past Due Bills',
    category: 'RISK',
    description: 'You have outstanding overdue invoices. Reclaiming past due invoices adds ₹66,000 back into your cash accounts.',
    impact: 'HIGH',
    actionText: 'Review Overdue Invoices',
    actionLink: '/invoices'
  }
];

const FALLBACK_PROJECTIONS = [
  { month: 'Jul', Revenue: 18000, Expense: 10500, Cash: 498500 },
  { month: 'Aug', Revenue: 19500, Expense: 10200, Cash: 507800 },
  { month: 'Sep', Revenue: 21000, Expense: 9900, Cash: 518900 }
];

export default function RedesignedAiAssistantPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'conversational' | 'invoice' | 'crm' | 'finance'>('conversational');
  const [loading, setLoading] = useState(true);

  // Tab 1: Conversational AI & Advisory State
  const [stats, setStats] = useState<any>(FALLBACK_STATS);
  const [insights, setInsights] = useState<any[]>(FALLBACK_INSIGHTS);
  const [projections, setProjections] = useState<any[]>(FALLBACK_PROJECTIONS);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  // WhatsApp simulation state (Future integration channel)
  const [whatsappSender, setWhatsappSender] = useState('+91 98765 43210');
  const [whatsappMsg, setWhatsappMsg] = useState('What is my outstanding balance?');
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([
    { sender: 'user', message: 'Hi there, do I owe anything?' },
    { sender: 'assistant', message: '👋 Hello! I am the automated *Kaasvex Billing Assistant*.\n\nI can help you audit balances and settle payments instantly.\nTry sending me: _"What is my outstanding balance?"_' }
  ]);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  // Tab 2: Invoice Intelligence State
  const [rawText, setRawText] = useState(
    "From: AWS Cloud Infrastructure Services\n" +
    "Invoice Number: INV-AWS-2026-990\n" +
    "Amount due: ₹48,500.00\n" +
    "Items:\n" +
    "- EC2 Cloud Compute Node Instance - ₹32,000.00\n" +
    "- Aurora Columnar Storage capacity - ₹16,500.00\n" +
    "Status: Unregistered Service Provider"
  );
  const [parsedInvoice, setParsedInvoice] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Tab 3: CRM Intelligence State
  const [leads, setLeads] = useState<any[]>([]);
  const [churnPredictions, setChurnPredictions] = useState<any[]>([]);
  const [scoringLeads, setScoringLeads] = useState(false);
  const [predictingChurn, setPredictingChurn] = useState(false);

  // Tab 4: Financial Intelligence State
  const [financeDiagnostics, setFinanceDiagnostics] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const whatsappEndRef = useRef<HTMLDivElement>(null);

  // Initial Hydration
  useEffect(() => {
    if (!authLoading && activeOrganization) {
      const hydrate = async () => {
        setLoading(true);
        await Promise.all([
          fetchDashboardData(),
          fetchChatSessions(),
          fetchCrmData(),
          fetchFinanceData()
        ]);
        setLoading(false);
      };
      hydrate();
    }
  }, [activeOrganization, authLoading]);

  // Autoscrollers
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    whatsappEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [whatsappLogs]);

  // Loaders
  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/ai/insights');
      if (res.data.stats) {
        setStats(res.data.stats);
        setInsights(res.data.insights || []);
        setProjections(res.data.projections || []);
      }
    } catch (err) {
      console.warn('AI Insights API fetch failed, utilizing fallback stats:', err);
    }
  };

  const fetchChatSessions = async (autoSelect = true) => {
    try {
      const res = await api.get('/ai/chat/sessions');
      const sessionList = res.data.sessions || [];
      setSessions(sessionList);

      if (autoSelect && sessionList.length > 0) {
        setActiveSessionId(sessionList[0].id);
        setMessages(sessionList[0].messages || []);
      } else if (sessionList.length === 0) {
        handleCreateSession("AI Advisory Session");
      }
    } catch (err) {
      console.warn('Chat sessions fetch failed:', err);
    }
  };

  const fetchCrmData = async () => {
    try {
      const [leadsRes, clientsRes] = await Promise.all([
        api.get('/leads'),
        api.get('/clients')
      ]);
      setLeads(leadsRes.data.leads || []);
      setChurnPredictions(clientsRes.data.clients || []);
    } catch (err) {
      console.warn('Failed to load CRM data:', err);
    }
  };

  const fetchFinanceData = async () => {
    setLoadingDiagnostics(true);
    try {
      const res = await api.get('/ai-automation/finance/diagnose');
      setFinanceDiagnostics(res.data);
    } catch (err) {
      console.warn('Failed to load financial diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Handlers for Tab 1 (Conversational AI Chat)
  const handleCreateSession = async (title: string) => {
    setCreatingSession(true);
    try {
      const res = await api.post('/ai/chat/sessions', { title });
      const newSession = res.data.session;
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const target = sessions.find(s => s.id === id);
    if (target) {
      setMessages(target.messages || []);
    }
  };

  const handleSendChat = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const messageToSend = promptOverride || inputMessage;
    if (!messageToSend.trim()) return;

    const userMsg = { role: 'USER', content: messageToSend, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setSendingChat(true);

    try {
      const res = await api.post('/ai/chat', {
        message: messageToSend,
        sessionId: activeSessionId || undefined
      });
      
      await fetchChatSessions(false);
      const assistantMsg = { role: 'ASSISTANT', content: res.data.reply, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
      
      if (!activeSessionId) {
        setActiveSessionId(res.data.sessionId);
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      const errorMsg = { role: 'ASSISTANT', content: '⚠️ Advisory Server Connection Interrupted. Please check your network connection or try again.', createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleDismissInsight = async (id: string) => {
    try {
      await api.patch(`/ai/insights/${id}/dismiss`);
      setInsights(prev => prev.filter(ins => ins.id !== id));
    } catch (err) {
      console.error('Failed to dismiss insight:', err);
    }
  };

  // WhatsApp simulation hook
  const handleSendWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappMsg.trim()) return;

    const userMsg = whatsappMsg;
    setWhatsappLogs(prev => [...prev, { sender: 'user', message: userMsg }]);
    setWhatsappMsg('');
    setSendingWhatsapp(true);

    try {
      const res = await api.post('/ai-automation/whatsapp/simulate', {
        senderPhone: whatsappSender,
        message: userMsg
      });
      setWhatsappLogs(prev => [...prev, { sender: 'assistant', message: res.data.responseMessage, action: res.data.actionTaken }]);
    } catch (err) {
      console.error('WhatsApp hook failed:', err);
      setWhatsappLogs(prev => [...prev, { sender: 'assistant', message: '⚠️ Simulating messaging assistant failed. Server offline.' }]);
    } finally {
      setSendingWhatsapp(false);
    }
  };

  // Tab 2 Handlers (Invoice Intelligence)
  const handleParseInvoice = async () => {
    setScanning(true);
    try {
      const res = await api.post('/ai-automation/invoice/parse', { text: rawText });
      setParsedInvoice(res.data);
    } catch (err) {
      console.error('Failed to parse invoice document:', err);
      alert('Invoice analysis failed to extract parameters.');
    } finally {
      setScanning(false);
    }
  };

  // Tab 3 Handlers (CRM Intelligence)
  const handleScoreLeads = async () => {
    setScoringLeads(true);
    try {
      const res = await api.post('/ai-automation/crm/score-leads');
      setLeads(res.data.scoredLeads || []);
      alert('Customer lead scores successfully audited and updated.');
    } catch (err) {
      console.error('Lead scoring failed:', err);
      alert('Failed to execute pipeline lead analysis.');
    } finally {
      setScoringLeads(false);
    }
  };

  const handlePredictChurn = async () => {
    setPredictingChurn(true);
    try {
      const res = await api.post('/ai-automation/crm/predict-churn');
      setChurnPredictions(res.data.churnPredictions || []);
      alert('Client retention indexes calculated and synchronized.');
    } catch (err) {
      console.error('Churn predictions failed:', err);
      alert('Failed to execute client churn index analysis.');
    } finally {
      setPredictingChurn(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[75vh] w-full flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-8 h-8 border-3 border-gray-100 dark:border-slate-800 border-t-violet-600 rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Initializing Advisory & Intelligence Hub...</span>
      </div>
    );
  }

  // Circular gauge drawing helper
  const drawCircleProgress = (percent: number, color: string) => {
    const radius = 24;
    const circ = 2 * Math.PI * radius;
    const strokeDashoffset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
    return (
      <svg className="w-14 h-14 transform -rotate-90">
        <circle cx="28" cy="28" r={radius} className="stroke-gray-100 dark:stroke-slate-800 fill-none" strokeWidth="3" />
        <circle 
          cx="28" 
          cy="28" 
          r={radius} 
          className="fill-none transition-all duration-500 ease-out" 
          stroke={color} 
          strokeWidth="3.5" 
          strokeDasharray={circ} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300 font-sans">
      
      {/* ================= BRANDING HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
            <span>AI Assistant</span>
          </h1>
          <p className="text-xs text-gray-400 dark:text-slate-400 font-medium mt-0.5">
            Operational dashboard for tax classification, payment delay predictions, client retention diagnostics, and financial runway audits.
          </p>
        </div>

        {activeTab === 'conversational' && (
          <button 
            onClick={() => handleCreateSession("New Advisory Session")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit dark:bg-violet-700 dark:hover:bg-violet-600"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Advisory Session</span>
          </button>
        )}
      </div>

      {/* ================= TAB CONTROL INTERFACE ================= */}
      <div className="flex items-center gap-1.5 border-b border-[#EEEEEE] dark:border-slate-800 text-xs font-semibold shrink-0">
        <button
          onClick={() => setActiveTab('conversational')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'conversational' ? 'text-gray-900 border-b-2 border-black font-bold dark:text-white dark:border-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Conversational Assistant
        </button>
        <button
          onClick={() => setActiveTab('invoice')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'invoice' ? 'text-gray-900 border-b-2 border-black font-bold dark:text-white dark:border-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Invoice Intelligence
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'crm' ? 'text-gray-900 border-b-2 border-black font-bold dark:text-white dark:border-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          CRM Intelligence
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 transition-colors relative ${
            activeTab === 'finance' ? 'text-gray-900 border-b-2 border-black font-bold dark:text-white dark:border-white' : 'text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Financial Intelligence
        </button>
      </div>

      {/* ================= TAB 1: CONVERSATIONAL ASSISTANT & CHANNEL SIMULATOR ================= */}
      {activeTab === 'conversational' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Main Chat Advisory Console */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col h-[590px]">
            
            {/* Header Area */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-white to-gray-50/50 dark:from-slate-900 dark:to-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-black dark:bg-slate-950 rounded-lg flex items-center justify-center relative overflow-hidden shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white">Kaasvex Advisory Console</h3>
                  <p className="text-[9px] text-gray-400 dark:text-slate-400 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>FINANCIAL INTELLIGENCE MODEL ACTIVE</span>
                  </p>
                </div>
              </div>

              {/* Session Selector */}
              <div className="relative shrink-0">
                <select
                  value={activeSessionId || ''}
                  onChange={(e) => handleSelectSession(e.target.value)}
                  className="appearance-none bg-gray-50 dark:bg-slate-800 text-[10px] font-bold text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-300 dark:focus:border-slate-700 transition-all cursor-pointer font-sans"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <Compass className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/30 dark:bg-slate-950/20 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                  <Bot className="w-8 h-8 text-gray-300 dark:text-slate-650 animate-bounce" />
                  <h4 className="text-xs font-bold text-gray-700 dark:text-slate-200">Audit Runway, Margins, and Invoices</h4>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400 leading-normal max-w-xs font-medium">Ask questions about receivables aging, cash flow parameters, or generate past-due payment reminder templates instantly.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-3 max-w-[85%] ${msg.role === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                      msg.role === 'USER' ? 'bg-[#EEEEEE] dark:bg-slate-800 text-gray-700 dark:text-slate-200' : 'bg-black text-white'
                    }`}>
                      {msg.role === 'USER' ? 'U' : 'AI'}
                    </div>

                    <div className={`p-3.5 rounded-xl border text-[11px] font-medium leading-relaxed font-sans shadow-xs ${
                      msg.role === 'USER' 
                        ? 'bg-black text-white border-transparent rounded-tr-none dark:bg-violet-650' 
                        : 'bg-white text-gray-700 border-[#EEEEEE] rounded-tl-none dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 markdown-bubble'
                    }`}>
                      <div className="space-y-2 whitespace-pre-wrap">
                        {msg.content.split('\n').map((line: string, i: number) => {
                          if (line.startsWith('### ')) {
                            return <h4 key={i} className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-1 mt-2">{line.substring(4)}</h4>;
                          }
                          if (line.startsWith('* ')) {
                            return <div key={i} className="pl-3 flex items-start gap-1.5 text-gray-600 dark:text-slate-300"><span className="text-violet-500">•</span> <span>{line.substring(2)}</span></div>;
                          }
                          if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                            return <div key={i} className="pl-3 flex items-start gap-1.5 text-gray-600 dark:text-slate-300"><span className="font-mono text-violet-500 font-bold">{line.substring(0,2)}</span> <span>{line.substring(3)}</span></div>;
                          }
                          if (line.startsWith('\`\`\`')) {
                            return null;
                          }
                          return <p key={i} className={msg.role === 'USER' ? 'text-white' : 'text-gray-600 dark:text-slate-350 font-semibold'}>{line}</p>;
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions Chips */}
            <div className="px-5 py-2.5 border-t border-gray-50 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 bg-white dark:bg-slate-900 select-none">
              <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest shrink-0 mr-1">Suggested:</span>
              <button 
                onClick={() => handleSendChat(undefined, "How is my runway and cash balance doing?")}
                className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
              >
                Audits & Runway
              </button>
              <button 
                onClick={() => handleSendChat(undefined, "Draft a payment reminder email for overdue invoices")}
                className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
              >
                Draft Reminders
              </button>
              <button 
                onClick={() => handleSendChat(undefined, "Analyze my software saas tools spending proportions")}
                className="text-[10px] font-semibold text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/20 px-2.5 py-1 rounded-full whitespace-nowrap transition-all"
              >
                SaaS Expenditures
              </button>
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <form onSubmit={handleSendChat} className="flex items-center gap-2.5">
                <input 
                  type="text" 
                  placeholder="Ask about cash reserve runways, explain margins, draft reminder templates..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={sendingChat}
                  className="flex-1 bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg px-4 py-2.5 text-xs text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 placeholder:text-gray-400 dark:placeholder:text-slate-500 font-medium transition-all"
                />
                <button 
                  type="submit"
                  disabled={sendingChat || !inputMessage.trim()}
                  className="w-9 h-9 rounded-lg bg-black dark:bg-slate-800 text-white hover:bg-gray-800 dark:hover:bg-slate-700 disabled:bg-gray-200 dark:disabled:bg-slate-900 disabled:scale-100 flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* WhatsApp channel simulator interface */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-xl shadow-lg flex flex-col h-[590px]">
            <div className="px-5 py-4 border-b border-zinc-900 flex items-center gap-2 shrink-0 bg-zinc-900/50 text-zinc-400">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">WhatsApp Billing Channel Simulator</span>
            </div>

            {/* Simulator screen */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-zinc-900/10 scrollbar-thin flex flex-col bg-slate-900/50">
              {whatsappLogs.map((log: any, idx: number) => (
                <div key={idx} className={`flex ${log.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed shadow-xs ${
                    log.sender === 'user'
                      ? 'bg-emerald-900 text-emerald-100 rounded-tr-none'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-none'
                  }`}>
                    <p className="whitespace-pre-wrap font-sans">{log.message}</p>
                    {log.action && (
                      <div className="mt-2 pt-1 border-t border-zinc-700 flex items-center gap-1 text-[7.5px] font-extrabold uppercase text-emerald-400 tracking-widest">
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Action: {log.action}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sendingWhatsapp && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 text-zinc-400 text-[10px] font-bold font-mono px-3 py-1.5 rounded flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                    <span>Billing assistant typing...</span>
                  </div>
                </div>
              )}
              <div ref={whatsappEndRef} />
            </div>

            {/* Input field Simulator */}
            <div className="p-4 border-t border-zinc-900 bg-zinc-950 space-y-3 shrink-0 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[8px] font-extrabold uppercase text-zinc-500 font-mono">Test Customer Phone</label>
                  <input
                    type="text"
                    value={whatsappSender}
                    onChange={(e) => setWhatsappSender(e.target.value)}
                    className="w-full bg-zinc-900 border border-transparent rounded px-2.5 py-1 text-[10.5px] font-mono text-zinc-300 focus:outline-none focus:border-zinc-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[8px] font-extrabold uppercase text-zinc-500 font-mono">Query Presets</label>
                  <select
                    onChange={(e) => setWhatsappMsg(e.target.value)}
                    className="w-full bg-zinc-900 border border-transparent rounded px-2.5 py-1 text-[10.5px] font-sans text-zinc-300 focus:outline-none focus:border-zinc-800 font-bold uppercase tracking-wider"
                  >
                    <option value="What is my outstanding balance?">Check Outstanding Dues</option>
                    <option value="Send me my invoice link">Request payment checkout link</option>
                    <option value="Hello billing bot">Greeting Bot</option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleSendWhatsapp} className="flex items-center gap-3">
                <input
                  type="text"
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  placeholder="Type simulated message..."
                  className="flex-1 bg-zinc-900 border border-transparent rounded-lg px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-800 transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={sendingWhatsapp || !whatsappMsg.trim()}
                  className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: INVOICE INTELLIGENCE ================= */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Document Ingestion & Email parsing */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Document Ingestion & Parsing</span>
                <p className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5 leading-relaxed">Paste supplier invoices or email notifications to automatically extract line items, classify tax structures, and predict delay risk.</p>
              </div>

              {/* Mock upload area */}
              <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-lg p-5 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-slate-800/40 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none">
                <Upload className="w-6 h-6 text-gray-400 dark:text-slate-500 mb-1" />
                <span className="text-[10px] font-bold text-gray-700 dark:text-slate-350">Simulate Invoice Document Drop</span>
                <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-0.5">Click to mock uploading raw vendor templates</span>
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent rounded-lg p-3 text-[10px] font-mono text-gray-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all leading-normal"
                  placeholder="Paste invoice text context here..."
                />
                {scanning && (
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent top-0 animate-bounce shadow-md" />
                )}
              </div>

              <button
                type="button"
                onClick={handleParseInvoice}
                disabled={scanning}
                className="w-full py-2.5 rounded-lg bg-black dark:bg-slate-850 border border-transparent dark:border-slate-750 text-white hover:bg-gray-800 dark:hover:bg-slate-800 transition-all font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting parameters...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Extract Invoiced Parameters</span>
                  </>
                )}
              </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRawText(
                  "Vendor: Tally Solutions Private Limited\n" +
                  "Inv No: TS-2026-88001\n" +
                  "Subtotal: ₹18,000.00\n" +
                  "Tax rate: 18% CGST/SGST\n" +
                  "Standard consulting billing voucher"
                )}
                className="bg-white dark:bg-slate-900 p-3 border border-[#EEEEEE] dark:border-slate-800 rounded-lg text-left hover:border-zinc-300 dark:hover:border-slate-700 transition-colors"
              >
                <span className="text-[8px] font-extrabold uppercase text-gray-400 dark:text-slate-500 block mb-1">Indian Consulting Vendor</span>
                <span className="text-[9px] text-gray-600 dark:text-slate-350 block truncate font-medium">Tally consulting invoice voucher</span>
              </button>
              <button
                onClick={() => setRawText(
                  "Supplier: Zoom Video Communications Inc.\n" +
                  "Invoice: #ZM-990812-US\n" +
                  "Total amount due: $149.00\n" +
                  "Enterprise corporate meeting room license"
                )}
                className="bg-white dark:bg-slate-900 p-3 border border-[#EEEEEE] dark:border-slate-800 rounded-lg text-left hover:border-zinc-300 dark:hover:border-slate-700 transition-colors"
              >
                <span className="text-[8px] font-extrabold uppercase text-gray-400 dark:text-slate-500 block mb-1">Multi-Currency Import (RCM)</span>
                <span className="text-[9px] text-gray-600 dark:text-slate-350 block truncate font-medium">Zoom international USD invoice</span>
              </button>
            </div>
          </div>

          {/* Predictions Output panel */}
          <div className="lg:col-span-7">
            {parsedInvoice ? (
              <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden divide-y divide-gray-100 dark:divide-slate-800 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-5 flex items-center justify-between bg-zinc-50/50 dark:bg-slate-900/50">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-widest block">Extracted Ledger Parameters</span>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{parsedInvoice.vendorName}</h3>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-350 px-2 py-0.5 rounded border border-zinc-200 dark:border-slate-700">
                    {parsedInvoice.invoiceNumber}
                  </span>
                </div>

                <div className="p-5 grid grid-cols-3 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase">Subtotal</span>
                    <p className="text-base font-extrabold text-gray-900 dark:text-white">{parsedInvoice.currency === 'USD' ? '$' : '₹'}{parsedInvoice.subtotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase">Tax Allocation</span>
                    <p className="text-base font-extrabold text-gray-900 dark:text-white">{parsedInvoice.currency === 'USD' ? '$' : '₹'}{parsedInvoice.taxAmount.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase">Gross Total</span>
                    <p className="text-base font-extrabold text-gray-900 dark:text-white">{parsedInvoice.currency === 'USD' ? '$' : '₹'}{parsedInvoice.total.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Items Breakdown list */}
                <div className="p-5 space-y-3">
                  <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase block">Smart Tax Classifications</span>
                  <div className="space-y-2">
                    {parsedInvoice.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-slate-800 border border-[#F0F0F0] dark:border-slate-700 rounded-lg text-xs leading-normal">
                        <div>
                          <p className="font-extrabold text-gray-800 dark:text-slate-200">{item.description}</p>
                          <span className="text-[9px] text-gray-400 dark:text-slate-400 font-medium">Category: {item.suggestedCategory}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-gray-900 dark:text-white">{parsedInvoice.currency === 'USD' ? '$' : '₹'}{item.amount.toLocaleString('en-IN')}</p>
                          <span className="text-[9px] text-violet-600 dark:text-violet-455 font-bold">GST {item.taxRatePercent}% Suggestion</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delay & RCM predictions */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-slate-800 border border-zinc-100 dark:border-slate-700 rounded-lg p-4 space-y-2 flex items-start gap-3">
                    <Activity className="w-5 h-5 text-zinc-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase block tracking-wider">Due Payment Prediction</span>
                      <p className="text-sm font-extrabold text-gray-800 dark:text-slate-200">Lag: {parsedInvoice.predictedDelayDays} Days Overdue</p>
                      <p className="text-[9.5px] text-gray-400 dark:text-slate-450 leading-normal">Operational regression metrics project a latency timeline of {parsedInvoice.predictedDelayDays} days beyond payment terms.</p>
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-slate-800 border border-zinc-100 dark:border-slate-700 rounded-lg p-4 space-y-2 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-zinc-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase block tracking-wider">Reverse Charge Audit</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          parsedInvoice.isReverseCharge 
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900/50' 
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50'
                        }`}>
                          {parsedInvoice.isReverseCharge ? 'RCM SECURED' : 'STANDARD GST'}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-gray-400 dark:text-slate-450 leading-normal">
                        {parsedInvoice.isReverseCharge 
                          ? 'Reverse charge audit active. 18% compliance holds will be self-logged on asset ledgers.' 
                          : 'Standard vendor invoice guidelines detected. Tax structures ledger files compile standard credit matches.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full border border-dashed border-[#DDDDDD] dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center text-zinc-400 dark:text-slate-500 bg-white dark:bg-slate-900 min-h-[350px]">
                <FileCode className="w-8 h-8 text-zinc-300 dark:text-slate-750 stroke-[1.5] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500">Awaiting parameter inputs</span>
                <p className="text-[9.5px] text-zinc-400 dark:text-slate-500 max-w-[280px] mt-1 leading-normal">Paste invoice email bodies or trigger preset simulations on the left console to extract accounting guidelines.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CRM PIPELINE & RETENTION INTELLIGENCE ================= */}
      {activeTab === 'crm' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">CRM Lead Scoring & Retention Analyzer</span>
              <p className="text-[9.5px] text-gray-400 dark:text-slate-400 mt-0.5 leading-relaxed">Calculate lead acquisition probability and update account client retention metrics.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleScoreLeads}
                disabled={scoringLeads}
                className="px-4 py-2 rounded-lg bg-black dark:bg-slate-800 dark:border dark:border-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-700 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                {scoringLeads ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scoring leads...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Score CRM Pipeline Leads</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePredictChurn}
                disabled={predictingChurn}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-slate-850 dark:border dark:border-slate-755 text-white hover:bg-zinc-800 dark:hover:bg-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
              >
                {predictingChurn ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing retention...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5" />
                    <span>Analyze Retention Risks</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Scored Leads Table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide block">Leads Pipeline Engagement Scoring</span>
                <p className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">Calculates quality ratios using communication volume metrics and maps prompt actions.</p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {leads.length > 0 ? (
                  leads.map((lead: any) => (
                    <div key={lead.id} className="p-3 border border-[#EEEEEE] dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-lg space-y-2 text-xs transition-colors bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-gray-800 dark:text-slate-200">{lead.companyName}</p>
                          <span className="text-[9px] text-gray-400 dark:text-slate-400 font-medium">Contact: {lead.contactPerson} ({lead.source || 'Direct'})</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          (lead.aiScore || 0) >= 70 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50' 
                            : 'bg-zinc-50 dark:bg-slate-800 text-zinc-600 dark:text-slate-350 border border-zinc-200 dark:border-slate-700'
                        }`}>
                          Quality Score: {lead.aiScore ? lead.aiScore.toFixed(0) : '0'}
                        </span>
                      </div>
                      
                      {lead.aiFollowUp && (
                        <div className="bg-zinc-50 dark:bg-slate-800/50 p-2 border border-[#F0F0F0] dark:border-slate-850 rounded text-[9px] text-zinc-500 dark:text-slate-400 leading-normal flex items-start gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                          <span>Recommended Action: {lead.aiFollowUp}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center py-6">No leads recorded in CRM pipeline.</p>
                )}
              </div>
            </div>

            {/* Churn Predictor Panel */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide block">Customer Retention Index</span>
                <p className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">Calculates retention probabilities mapping transaction intervals and touchpoints.</p>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                {churnPredictions.length > 0 ? (
                  churnPredictions.map((client: any) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border border-[#EEEEEE] dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-lg text-xs transition-colors bg-white dark:bg-slate-900">
                      <div>
                        <p className="font-extrabold text-gray-800 dark:text-slate-200">{client.name}</p>
                        <span className="text-[9.5px] text-gray-400 dark:text-slate-400 font-medium">Billed Revenue: ₹{client.totalRevenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                          (client.aiChurnRisk || 0) >= 50 
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-450 border border-red-200 dark:border-red-900/50' 
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50'
                        }`}>
                          Risk Ratio: {client.aiChurnRisk ? client.aiChurnRisk.toFixed(1) : '0.0'}%
                        </span>
                        <p className="text-[8.5px] text-gray-400 dark:text-slate-500 font-medium mt-1">Churn rating</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center py-6">No clients registered to classify retention index.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: FINANCIAL INTELLIGENCE ================= */}
      {activeTab === 'finance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* ROW 1: 4x KPI CARD GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Financial Health</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.healthScore}%</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-455 font-extrabold block">Optimized Runway</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(stats.healthScore, '#7C3AED')}
                <span className="absolute text-[10px] font-bold text-violet-600 dark:text-violet-400 font-mono">Index</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Cash Runway</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.runwayMonths.toFixed(1)} Mo</h3>
                <span className={`text-[9px] font-extrabold block ${stats.runwayMonths >= 6 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600 dark:text-rose-455'}`}>
                  {stats.runwayMonths >= 6 ? 'Safe Margin' : 'Critical Threshold'}
                </span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(stats.runwayMonths * 8, stats.runwayMonths >= 6 ? '#10B981' : '#EF4444')}
                <span className="absolute text-[10px] font-bold text-gray-700 dark:text-slate-300 font-mono">Mos</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">Net Profit Margin</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{stats.netProfitMargin.toFixed(1)}%</h3>
                <span className="text-[9px] text-[#4F46E5] dark:text-[#6366F1] font-extrabold block">Revenues - Outflows</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(stats.netProfitMargin * 2, '#4F46E5')}
                <span className="absolute text-[10px] font-bold text-[#4F46E5] dark:text-[#6366F1] font-mono">Net</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 border border-[#EEEEEE] dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider block">MRR Retainer</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹{stats.mrr.toLocaleString('en-IN')}</h3>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-extrabold block">Locked recurring cash</span>
              </div>
              <div className="relative flex items-center justify-center shrink-0">
                {drawCircleProgress(75, '#10B981')}
                <span className="absolute text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">ARR</span>
              </div>
            </div>
          </div>

          {financeDiagnostics ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 6-Month cash projection */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide block">6-Month Cash Runway Forecast</span>
                    <p className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">Statistical projection curves calculated using historical billing inflows and operating expenses.</p>
                  </div>

                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={financeDiagnostics.forecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#F1F1F1'} />
                        <XAxis dataKey="month" tick={{ fontSize: 9, fill: isDark ? '#94A3B8' : '#888888' }} />
                        <YAxis tick={{ fontSize: 9, fill: isDark ? '#94A3B8' : '#888888' }} />
                        <Tooltip contentStyle={{ fontSize: '10px', background: isDark ? '#0F172A' : '#ffffff', border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`, color: isDark ? '#ffffff' : '#000000' }} />
                        <Line type="monotone" dataKey="inflow" stroke="#10B981" strokeWidth={2} name="Projected Inflow" dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="outflow" stroke="#EF4444" strokeWidth={1.5} name="Projected Outflow" dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="projectedBalance" stroke={isDark ? "#38BDF8" : "#3B82F6"} strokeWidth={2} name="Projected Cash Balance" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* double entry integrity checks */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase">Ledger Audit State</span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        financeDiagnostics.ledgerAudit.status === 'SECURE' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50' 
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900/50'
                      }`}>
                        {financeDiagnostics.ledgerAudit.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase">Double-Entry Ledger Health</span>
                      <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        {financeDiagnostics.ledgerAudit.healthScore}%
                      </h3>
                      <p className="text-[9px] text-gray-400 dark:text-slate-400 leading-normal">General ledger analysis verifies balanced debit/credit transactions, reporting outliers and duplicate logs.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-450 uppercase block">Audit Warnings</span>
                    {financeDiagnostics.ledgerAudit.warnings.length > 0 ? (
                      financeDiagnostics.ledgerAudit.warnings.map((w: any, idx: number) => (
                        <div key={idx} className="bg-red-50 dark:bg-red-950/20 p-2 border border-red-100 dark:border-red-900/50 rounded text-[9.5px] text-red-700 dark:text-red-405 leading-normal flex items-start gap-1 bg-white dark:bg-slate-900">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block text-gray-800 dark:text-slate-200">{w.title}</span>
                            <span className="text-gray-600 dark:text-slate-400 font-semibold">{w.description}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 border border-emerald-100 dark:border-emerald-900/50 rounded text-[9.5px] text-emerald-700 dark:text-emerald-450 leading-normal flex items-center gap-1.5 bg-white dark:bg-slate-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>All ledgers balanced. No anomalies detected.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expense outliers log */}
              <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs p-5 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-800 dark:text-white uppercase tracking-wide block">Expense Outliers Log</span>
                  <p className="text-[9px] text-gray-400 dark:text-slate-400 mt-0.5">System scans recent expenditures against typical category averages to flag potential leaks.</p>
                </div>

                <div className="space-y-2">
                  {financeDiagnostics.expenseDiagnostics && financeDiagnostics.expenseDiagnostics.length > 0 ? (
                    financeDiagnostics.expenseDiagnostics.map((diag: any) => (
                      <div key={diag.id} className="flex items-center justify-between p-3 border border-[#EEEEEE] dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-lg text-xs transition-colors bg-white dark:bg-slate-900">
                        <div>
                          <p className="font-extrabold text-gray-800 dark:text-slate-200">Expense amount: ₹{diag.amount.toLocaleString('en-IN')}</p>
                          <span className="text-[9.5px] text-gray-400 dark:text-slate-400 font-mono font-medium">{diag.reason}</span>
                        </div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          diag.aiAnomalyStatus === 'CRITICAL_ANOMALY' 
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-450 border border-red-200 dark:border-red-900/50' 
                            : (diag.aiAnomalyStatus === 'WARNING_OUTLIER_CAPS' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900/50' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/50')
                        }`}>
                          {diag.aiAnomalyStatus.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center py-6">No expenses logged to inspect.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 border border-dashed border-[#DDDDDD] dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center text-zinc-400 dark:text-slate-500 min-h-[300px]">
              <Activity className="w-8 h-8 text-zinc-300 dark:text-slate-700 stroke-[1.5] mb-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500">Loading diagnostics dashboard...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
