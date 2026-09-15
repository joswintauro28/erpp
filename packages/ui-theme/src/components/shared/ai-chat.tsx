"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Plus,
  MessageSquare,
  BarChart3,
  X,
  Copy,
  Check,
  RotateCcw,
  Square,
  Edit2,
  Search,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api, API_BASE, getAccessToken } from "@datavex/auth-middleware";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../ui/table";

// ─── Types ───────────────────────────────────────────────────────────

export type AIModule = "admin" | "crm" | "billing" | "inventory";

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  streaming?: boolean;
  input_tokens?: number;
  output_tokens?: number;
  response_time_ms?: number;
}

export interface AISession {
  id: string;
  title: string;
  module: string;
  message_count: number;
  created_at: string;
  updated_at?: string;
}

export interface DynamicSuggestion {
  text: string;
  icon?: string;
  category?: string;
}

export interface AnalyticsData {
  total_messages: number;
  total_sessions: number;
  total_tokens_used: number;
  avg_response_time_ms: number;
  messages_today: number;
  sessions_today: number;
}

export interface AIChatProps {
  module: AIModule;
  /** Override the API base URL */
  apiBase?: string;
  /** Optional CSS class for the root container */
  className?: string;
  /** Whether the chat is embedded in compact/widget mode (e.g. floating bot) */
  compact?: boolean;
  /** Callback when module changes in widget mode */
  onModuleChange?: (module: AIModule) => void;
}

// ─── Module Metadata ─────────────────────────────────────────────────

export const MODULE_META: Record<
  AIModule,
  {
    title: string;
    shortTitle: string;
    icon: string;
    badgeColor: string;
    welcome: string;
    suggestions: Array<{ text: string; icon: string; description?: string }>;
  }
> = {
  admin: {
    title: "Executive AI Assistant",
    shortTitle: "Admin AI",
    icon: "⚡",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    welcome:
      "I am DATACLAIRE, your Executive AI Assistant. I monitor cross-module health, aggregate business KPIs, and assist with organization governance.",
    suggestions: [
      { text: "System overview: active customers, invoices & inventory status", icon: "📊", description: "Aggregated health check across all modules" },
      { text: "Which items across all modules require immediate attention?", icon: "⚠️", description: "Flagged blockers, low stock & overdue receivables" },
      { text: "Summarize current quarter business performance", icon: "📈", description: "Revenue totals, lead velocity, and fulfillment metrics" },
      { text: "Show system health and recent audit activity", icon: "🛡️", description: "Security events and user action trails" },
    ],
  },
  crm: {
    title: "CRM AI Sales Assistant",
    shortTitle: "CRM AI",
    icon: "👥",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    welcome:
      "I am your CRM AI Assistant. I analyze client accounts, score pipeline opportunities, track conversion rates, and draft targeted sales communications.",
    suggestions: [
      { text: "Show me the top leads by conversion score", icon: "🎯", description: "Prioritize hot prospects ready for outreach" },
      { text: "What is our total active pipeline value?", icon: "💰", description: "Open sales order and requirement valuation" },
      { text: "Draft a follow-up email for high-value leads", icon: "✉️", description: "Personalized executive email draft" },
      { text: "Which customer accounts have pending quotations?", icon: "📋", description: "Quotes awaiting client signature or approval" },
    ],
  },
  billing: {
    title: "Billing & Finance AI Assistant",
    shortTitle: "Billing AI",
    icon: "💳",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    welcome:
      "I am your Finance & Billing AI Assistant. I track invoice balances, calculate GST summaries, monitor aging receivables, and reconcile ledger records.",
    suggestions: [
      { text: "Analyze all overdue invoices and outstanding balances", icon: "⏳", description: "Aging receivables and dunning priorities" },
      { text: "What is our GST tax liability breakdown this month?", icon: "📑", description: "CGST, SGST, and IGST totals" },
      { text: "Show revenue trends and recent payment collections", icon: "💵", description: "Cash flow velocity and daily collection log" },
      { text: "List pending quotations awaiting conversion", icon: "🔄", description: "Quotation pipeline to invoice conversion" },
    ],
  },
  inventory: {
    title: "Inventory & Supply AI Assistant",
    shortTitle: "Inventory AI",
    icon: "📦",
    badgeColor: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/20",
    welcome:
      "I am your Inventory & Logistics AI Assistant. I track warehouse stock levels, forecast reorders, monitor purchase orders, and track batch serial items.",
    suggestions: [
      { text: "Which products are critically low on stock?", icon: "⚠️", description: "Items below safety threshold requiring POs" },
      { text: "List all pending purchase orders and expected arrivals", icon: "🚚", description: "In-transit supplier shipments" },
      { text: "Show stock distribution across our active warehouses", icon: "🏭", description: "Warehouse bin balances and utilization" },
      { text: "What are the latest stock movement logs?", icon: "📦", description: "Recent in, out, and adjustment logs" },
    ],
  },
};

// ─── Markdown & Code Parser ──────────────────────────────────────────

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg border border-border bg-muted/70 overflow-hidden font-mono text-[12px]">
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/80 bg-muted text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">{language || "code"}</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </Button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-foreground leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MarkdownTable({ rows }: { rows: string[] }) {
  if (rows.length < 2) return null;

  const headerRow = rows[0]
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const bodyRows = rows.slice(2).map((r) =>
    r
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/80">
            {headerRow.map((h, i) => (
              <TableHead key={i} className="font-semibold text-foreground px-3.5 py-2">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bodyRows.map((row, rIdx) => (
            <TableRow key={rIdx} className="hover:bg-muted/40">
              {row.map((cell, cIdx) => (
                <TableCell key={cIdx} className="text-foreground px-3.5 py-2">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = "";
  let tableBuffer: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ml-4 my-2 space-y-1 list-disc text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i} className="text-xs sm:text-[13px] leading-relaxed text-foreground">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      elements.push(<MarkdownTable key={`tbl-${elements.length}`} rows={tableBuffer} />);
      tableBuffer = [];
    }
  };

  const renderInline = (s: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|₹[\d,.]+|\$[\d,.]+|INR\s*[\d,.]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        parts.push(s.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={match.index} className="font-semibold text-foreground">
            {token.slice(2, -2)}
          </strong>,
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={match.index}
            className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono border border-border text-[var(--shell-brand)] dark:text-[var(--shell-accent)]"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else if (token.startsWith("₹") || token.startsWith("$") || token.startsWith("INR")) {
        parts.push(
          <span
            key={match.index}
            className="font-medium text-[var(--shell-brand)] dark:text-[var(--shell-accent)] bg-[var(--shell-brand)]/10 dark:bg-[var(--shell-brand)]/20 px-1.5 py-0.5 rounded text-[12px]"
          >
            {token}
          </span>,
        );
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < s.length) {
      parts.push(s.slice(lastIndex));
    }
    return parts.length > 0 ? parts : s;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushList();
        flushTable();
        elements.push(
          <CodeBlock
            key={`code-${elements.length}`}
            code={codeBuffer.join("\n")}
            language={codeLang}
          />,
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = "";
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Bullet lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="text-xs sm:text-[13px] font-bold text-foreground mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-sm font-bold text-foreground mt-3.5 mb-1.5">
          {trimmed.slice(3)}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-sm sm:text-base font-bold text-foreground mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>,
      );
      continue;
    }

    // Paragraph
    if (trimmed === "") {
      flushList();
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    flushList();
    elements.push(
      <p key={i} className="text-xs sm:text-[13px] leading-relaxed mb-1.5 min-h-[1em]">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  flushTable();
  return <>{elements}</>;
}

// ─── Grouping Helper for Sessions ────────────────────────────────────

function groupSessionsByDate(sessions: AISession[]) {
  const groups: { [key: string]: AISession[] } = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 86400000 * 7;

  for (const s of sessions) {
    const sDate = new Date(s.updated_at || s.created_at).getTime();
    if (sDate >= today) {
      groups.Today.push(s);
    } else if (sDate >= yesterday) {
      groups.Yesterday.push(s);
    } else if (sDate >= sevenDaysAgo) {
      groups["Previous 7 Days"].push(s);
    } else {
      groups.Older.push(s);
    }
  }

  return Object.entries(groups).filter(([_, items]) => items.length > 0);
}

// ─── Main AIChat Component ───────────────────────────────────────────

export function AIChat({
  module,
  apiBase = "",
  className,
  compact = false,
  onModuleChange,
}: AIChatProps) {
  const meta = MODULE_META[module] || MODULE_META.admin;

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(!compact);
  const [sessionSearch, setSessionSearch] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dynamicSuggestions, setDynamicSuggestions] = useState<DynamicSuggestion[]>([]);
  const [contextMetrics, setContextMetrics] = useState<Array<{ label: string; value: string | number }>>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    try {
      const data = await api.get<AISession[]>(`/ai/sessions?module=${module}`);
      setSessions(data || []);
    } catch {
      // silently handle
    }
  }, [module]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch dynamic suggestions
  const fetchDynamicSuggestions = useCallback(async () => {
    try {
      const data = await api.get<{ suggestions: DynamicSuggestion[]; context_summary?: string }>(
        `/ai/suggestions/${module}/dynamic`,
      );
      setDynamicSuggestions(data?.suggestions || []);
      
      // Parse context summary cleanly into metrics chips
      if (data?.context_summary) {
        const parts = data.context_summary.split(",").map((p) => p.trim());
        const parsed = parts.map((part) => {
          const [rawKey, val] = part.split(":").map((s) => s.trim());
          const cleanKey = rawKey.replace(/^total_/, "").replace(/_/g, " ");
          const capitalizedKey = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
          return { label: capitalizedKey, value: val || "0" };
        });
        setContextMetrics(parsed);
      } else {
        setContextMetrics([]);
      }
    } catch {
      // fallback to static
    }
  }, [module]);

  useEffect(() => {
    if (messages.length === 0) {
      fetchDynamicSuggestions();
    }
  }, [messages.length, fetchDynamicSuggestions]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.get<AnalyticsData>("/ai/analytics/overview");
      setAnalytics(data);
    } catch {
      // ignore
    }
  }, []);

  // Load session history
  const loadSession = useCallback(async (sid: string) => {
    try {
      const data = await api.get<{ messages: AIChatMessage[] }>(`/ai/history/${sid}`);
      setMessages(data?.messages || []);
      setSessionId(sid);
      if (compact) {
        setSidebarOpen(false);
      }
    } catch {
      // fallback
    }
  }, [compact]);

  // Start new chat
  const newChat = useCallback(() => {
    if (streaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);
    setInput("");
    setStreaming(false);
    setLoading(false);
    fetchDynamicSuggestions();
    textareaRef.current?.focus();
    if (compact) {
      setSidebarOpen(false);
    }
  }, [compact, fetchDynamicSuggestions, streaming]);

  // Delete single session
  const deleteSession = useCallback(
    async (sid: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        await api.delete(`/ai/sessions/${sid}`);
        setSessions((prev) => prev.filter((s) => s.id !== sid));
        if (sessionId === sid) {
          newChat();
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [sessionId, newChat],
  );

  // Bulk clear all sessions
  const clearAllSessions = useCallback(async () => {
    try {
      await api.delete(`/ai/sessions?module=${module}`);
      setSessions([]);
      newChat();
      setClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear sessions:", err);
    }
  }, [module, newChat]);

  // Rename session
  const handleRenameSession = useCallback(
    async (sid: string, e?: React.MouseEvent | React.FormEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      const title = editTitle.trim();
      if (!title) {
        setEditingSessionId(null);
        return;
      }
      try {
        await api.patch(`/ai/sessions/${sid}`, { title });
        setSessions((prev) => prev.map((s) => (s.id === sid ? { ...s, title } : s)));
        setEditingSessionId(null);
      } catch (err) {
        console.error("Failed to rename session:", err);
      }
    },
    [editTitle],
  );

  // Copy message text
  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Stop streaming
  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    setLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  };

  // Send message with SSE streaming
  const sendMessageStreaming = useCallback(
    async (msg: string) => {
      const userMsg: AIChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
        created_at: new Date().toISOString(),
      };
      const assistantId = `asst-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          streaming: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setLoading(true);
      setStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = getAccessToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const endpoint = `${API_BASE}/ai/chat/stream`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            message: msg,
            session_id: sessionId,
            module,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let newSessionId = sessionId;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (eventType === "metadata") {
                  newSessionId = data.session_id || newSessionId;
                  if (data.message_id) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId ? { ...m, id: data.message_id } : m,
                      ),
                    );
                  }
                } else if (eventType === "content") {
                  fullContent += data.content || "";
                  const snapshot = fullContent;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId || m.id === data.message_id
                        ? { ...m, content: snapshot }
                        : m,
                    ),
                  );
                } else if (eventType === "done") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            streaming: false,
                            input_tokens: data.input_tokens,
                            output_tokens: data.output_tokens,
                            response_time_ms: data.response_time_ms,
                          }
                        : m,
                    ),
                  );
                } else if (eventType === "error") {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: `⚠️ ${data.error || "Stream error"}`, streaming: false }
                        : m,
                    ),
                  );
                }
              } catch {
                // skip malformed
              }
            }
          }
        }

        if (newSessionId && !sessionId) {
          setSessionId(newSessionId);
          fetchSessions();
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `⚠️ Failed to get response: ${(err as Error).message}`,
                  streaming: false,
                }
              : m,
          ),
        );
      } finally {
        setLoading(false);
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, module, fetchSessions],
  );

  const sendMessage = useCallback(
    (customText?: string) => {
      const textToSend = customText || input.trim();
      if (!textToSend || loading) return;
      setInput("");
      sendMessageStreaming(textToSend);
    },
    [input, loading, sendMessageStreaming],
  );

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      sendMessageStreaming(lastUserMsg.content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const query = sessionSearch.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(query));
  }, [sessions, sessionSearch]);

  const groupedSessions = useMemo(
    () => groupSessionsByDate(filteredSessions),
    [filteredSessions],
  );

  const isEmpty = messages.length === 0;

  return (
    <div
      className={cn(
        "flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border border-border shadow-xs relative",
        className,
      )}
      role="main"
      aria-label={meta.title}
    >
      {/* ─── Sessions Drawer / Sidebar ─────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card/60 backdrop-blur-xs transition-all duration-300 ease-in-out shrink-0 z-20",
          sidebarOpen
            ? compact
              ? "w-64 absolute inset-y-0 left-0 shadow-2xl bg-card"
              : "w-68 sm:w-72"
            : "w-0 overflow-hidden border-r-0",
        )}
      >
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={15} className="text-[var(--shell-brand)] dark:text-[var(--shell-accent)] shrink-0" />
            <span className="text-xs font-semibold text-foreground truncate">
              Chat History
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
              {sessions.length}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="Close sidebar"
          >
            <PanelLeftClose size={15} />
          </Button>
        </div>

        {/* New Chat & Search */}
        <div className="p-3 space-y-2 border-b border-border/60">
          <Button
            type="button"
            onClick={newChat}
            className="w-full bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white text-xs h-8 gap-2 font-medium shadow-2xs"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </Button>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search past chats..."
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/50 placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-[var(--shell-brand)]"
            />
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3.5 [scrollbar-width:thin]">
          {groupedSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {sessionSearch ? "No matching chats found." : "No previous chats yet."}
            </div>
          ) : (
            groupedSessions.map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {groupName}
                </div>
                {groupItems.map((s) => {
                  const isActive = s.id === sessionId;
                  const isEditing = editingSessionId === s.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => !isEditing && loadSession(s.id)}
                      className={cn(
                        "group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
                        isActive
                          ? "bg-accent text-foreground font-medium border-l-[3px] border-[var(--shell-brand)] pl-2 shadow-2xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleRenameSession(s.id, e)}
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            className="h-6 text-xs px-1.5 py-0.5"
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-emerald-500 hover:bg-emerald-500/10"
                          >
                            <Check size={12} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingSessionId(null)}
                            className="h-6 w-6 text-muted-foreground hover:bg-muted"
                          >
                            <X size={12} />
                          </Button>
                        </form>
                      ) : (
                        <>
                          <span className="truncate flex-1 pr-2 text-left">{s.title}</span>
                          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSessionId(s.id);
                                setEditTitle(s.title);
                              }}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Rename chat"
                            >
                              <Edit2 size={11} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => deleteSession(s.id, e)}
                              className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                              title="Delete chat"
                            >
                              <Trash2 size={11} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-border/80 flex items-center justify-between text-[11px] text-muted-foreground">
          {clearConfirm ? (
            <div className="flex items-center gap-2 w-full justify-between animate-in fade-in duration-200">
              <span className="text-[10px] text-red-500 font-medium">Clear all?</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={clearAllSessions}
                  className="h-6 px-2 text-[10px]"
                >
                  Yes, clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClearConfirm(false)}
                  className="h-6 px-2 text-[10px]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClearConfirm(true)}
                disabled={sessions.length === 0}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-red-500 gap-1.5"
              >
                <Trash2 size={12} />
                <span>Clear History</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAnalytics(!showAnalytics);
                  if (!showAnalytics) fetchAnalytics();
                }}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="View Analytics"
              >
                <BarChart3 size={13} />
                <span>Stats</span>
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main Chat Workspace ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-background">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-xs px-4 py-2.5 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Open Chat History"
              >
                <PanelLeft size={16} />
              </Button>
            )}

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/25 text-[var(--shell-brand)] dark:text-[var(--shell-accent)]">
              <Sparkles size={16} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {meta.title}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-2 py-0 h-4.5 font-medium uppercase tracking-wider hidden sm:inline-flex",
                    meta.badgeColor,
                  )}
                >
                  {meta.shortTitle}
                </Badge>

                <Badge variant="outline" className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 h-4.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Grounded
                </Badge>
              </div>

              {/* Formatted live metrics */}
              {contextMetrics.length > 0 && (
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {contextMetrics.map((m, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-[10px] text-muted-foreground font-mono px-1.5 py-0 h-4 font-normal"
                    >
                      {m.label}: <strong className="text-foreground font-semibold ml-0.5">{m.value}</strong>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {compact && onModuleChange && (
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
                {module}
              </Badge>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={newChat}
              className="h-8 gap-1.5 text-xs font-medium shadow-2xs hover:border-[var(--shell-brand)]/40"
              title="Start New Chat"
            >
              <Plus size={13} />
              <span className="hidden md:inline">New Chat</span>
            </Button>
          </div>
        </header>

        {/* Analytics Dropdown Panel */}
        {showAnalytics && analytics && (
          <Card className="rounded-none border-x-0 border-t-0 border-b border-border bg-card shadow-xs animate-in slide-in-from-top-2 duration-200">
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-[var(--shell-brand)] dark:text-[var(--shell-accent)] flex items-center gap-1.5">
                <BarChart3 size={14} />
                AI Assistant Performance & Usage
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowAnalytics(false)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="text-base font-bold text-foreground">
                    {analytics.total_messages}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Total Messages</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="text-base font-bold text-foreground">
                    {analytics.total_sessions}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Total Sessions</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="text-base font-bold text-foreground">
                    {analytics.messages_today}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Messages Today</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                  <div className="text-base font-bold text-foreground">
                    {analytics.avg_response_time_ms > 0
                      ? `${(analytics.avg_response_time_ms / 1000).toFixed(1)}s`
                      : "0.8s"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Avg Response</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 [scrollbar-width:thin]">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 max-w-2xl mx-auto px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/25 text-[var(--shell-brand)] dark:text-[var(--shell-accent)] text-xl shadow-2xs mb-3">
                {meta.icon}
              </div>
              <h2 className="text-base font-semibold text-foreground mb-1.5">
                How can I assist your {meta.shortTitle} workflow?
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 max-w-md">
                {meta.welcome}
              </p>

              {/* Suggestions */}
              <div className="w-full space-y-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left px-1">
                  Suggested Questions & Actions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {(dynamicSuggestions.length > 0
                    ? dynamicSuggestions.map((s) => ({ text: s.text, icon: s.icon || "💡", description: s.category || "Live context prompt" }))
                    : meta.suggestions
                  ).map((item, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="outline"
                      onClick={() => sendMessage(item.text)}
                      className="h-auto p-3.5 rounded-xl border border-border bg-card hover:bg-accent/60 hover:border-[var(--shell-brand)]/40 hover:shadow-2xs transition-all text-xs text-foreground group flex items-start justify-start text-left whitespace-normal"
                    >
                      <span className="text-base shrink-0 mt-0.5 mr-3">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium leading-snug group-hover:text-foreground">
                          {item.text}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={13} className="text-muted-foreground/60 group-hover:text-foreground mt-1 shrink-0 transition-transform group-hover:translate-x-0.5 ml-2" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5 w-full">
              {messages.map((msg) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 items-start group",
                      isUser ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="h-7 w-7 rounded-lg shadow-2xs mt-0.5">
                      <AvatarFallback
                        className={cn(
                          "rounded-lg text-xs font-semibold",
                          isUser
                            ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                            : "bg-[var(--shell-brand)] text-white dark:bg-[var(--shell-brand)] dark:text-[var(--shell-accent)]",
                        )}
                      >
                        {isUser ? <User size={13} /> : <Bot size={13} />}
                      </AvatarFallback>
                    </Avatar>

                    {/* Message Bubble Container */}
                    <div
                      className={cn(
                        "flex flex-col space-y-1.5 max-w-[88%] sm:max-w-[80%]",
                        isUser ? "items-end" : "items-start",
                      )}
                    >
                      {/* Name / Role Label */}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                        <span className="font-medium text-foreground">
                          {isUser ? "You" : "DATAVEX AI"}
                        </span>
                        {!isUser && (
                          <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                            {meta.shortTitle}
                          </Badge>
                        )}
                      </div>

                      {/* Content Card */}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-2xs",
                          isUser
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-xs"
                            : "bg-card border border-border/90 text-foreground rounded-tl-xs",
                        )}
                      >
                        {msg.content ? (
                          renderMarkdown(msg.content)
                        ) : msg.streaming ? (
                          <div className="flex items-center gap-2.5 py-1">
                            <Sparkles size={14} className="text-[var(--shell-brand)] dark:text-[var(--shell-accent)] animate-spin" style={{ animationDuration: "3s" }} />
                            <span className="text-xs text-muted-foreground font-medium animate-pulse">
                              DATAVEX AI is analyzing module records...
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {/* Toolbar for assistant */}
                      {!isUser && msg.content && !msg.streaming && (
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity px-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(msg.id, msg.content)}
                            className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                            title="Copy response"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check size={11} className="text-emerald-500" />
                            ) : (
                              <Copy size={11} />
                            )}
                            <span>{copiedMessageId === msg.id ? "Copied" : "Copy"}</span>
                          </Button>

                          {msg.response_time_ms ? (
                            <span>· {(msg.response_time_ms / 1000).toFixed(1)}s</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <footer className="border-t border-border bg-card/60 backdrop-blur-xs p-3.5 shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <div className="relative bg-card border border-border rounded-2xl shadow-2xs focus-within:border-[var(--shell-brand)] focus-within:ring-2 focus-within:ring-[var(--shell-brand)]/15 transition-all p-2 flex flex-col gap-1.5">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask ${meta.shortTitle} anything...`}
                rows={1}
                disabled={loading}
                className="w-full bg-transparent border-none outline-none ring-0 shadow-none px-2.5 pt-1.5 pb-1 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 resize-none max-h-32 custom-scrollbar"
                style={{ minHeight: "38px", outline: "none", boxShadow: "none", border: "none" }}
              />

              <div className="flex items-center justify-between pt-1 border-t border-border/40 px-1">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="hidden sm:inline">Enter to send · Shift + Enter for new line</span>
                </div>

                {streaming ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={stopGenerating}
                    className="h-7 px-2.5 text-xs gap-1 font-medium"
                  >
                    <Square size={11} />
                    <span>Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="h-7 w-7 rounded-lg bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white shadow-2xs"
                    aria-label="Send message"
                  >
                    <Send size={13} />
                  </Button>
                )}
              </div>
            </div>

            {messages.length > 0 && !loading && (
              <div className="flex items-center justify-end text-[10px] text-muted-foreground mt-1.5 px-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={retryLastMessage}
                  className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw size={10} />
                  <span>Regenerate last response</span>
                </Button>
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
