"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Plus,
  ChevronDown,
  MessageSquare,
  BarChart3,
  Zap,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { api, API_BASE, getAccessToken } from "@datavex/auth-middleware";

// ─── Types ───────────────────────────────────────────────────────────

export type AIModule = "admin" | "crm" | "billing" | "inventory";

interface AIChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  streaming?: boolean;
}

interface AISession {
  id: string;
  title: string;
  module: string;
  message_count: number;
  created_at: string;
  updated_at?: string;
}

interface DynamicSuggestion {
  text: string;
  icon?: string;
  category?: string;
}

interface AnalyticsData {
  total_messages: number;
  total_sessions: number;
  total_tokens_used: number;
  avg_response_time_ms: number;
  messages_today: number;
}

interface AIChatProps {
  module: AIModule;
  /** Override the API base URL (default: empty string = relative /api/ai) */
  apiBase?: string;
  /** Optional CSS class for the root container */
  className?: string;
}

// ─── Module Metadata ─────────────────────────────────────────────────

const MODULE_META: Record<
  AIModule,
  { title: string; icon: string; color: string; welcome: string; suggestions: string[] }
> = {
  admin: {
    title: "Admin AI Assistant",
    icon: "🔧",
    color: "text-[var(--shell-accent)]",
    welcome:
      "Hello! I'm DATACLAIRE, your AI-powered ERP assistant. I can help you with cross-module insights, system health, and business analytics. What would you like to know?",
    suggestions: [
      "Give me an overview of all modules",
      "What are the pending items across the system?",
      "Show me a summary of recent activity",
      "How is the overall business performance?",
    ],
  },
  crm: {
    title: "CRM AI Assistant",
    icon: "👥",
    color: "text-blue-400",
    welcome:
      "Hello! I'm your CRM AI Assistant. I can help you analyze customer data, review your pipeline, and draft professional communications. How can I assist you today?",
    suggestions: [
      "Show me the top 5 leads by score",
      "How many customers are in the Enterprise tier?",
      "What's our pipeline value this month?",
      "Which leads need follow-up?",
    ],
  },
  billing: {
    title: "Billing AI Assistant",
    icon: "💰",
    color: "text-emerald-400",
    welcome:
      "Hello! I'm your Billing AI Assistant. I can help you with invoice management, payment tracking, GST queries, and revenue analysis. What would you like to explore?",
    suggestions: [
      "What invoices are overdue?",
      "Show me the outstanding amount",
      "What's the revenue trend this quarter?",
      "List pending quotations awaiting approval",
    ],
  },
  inventory: {
    title: "Inventory AI Assistant",
    icon: "📦",
    color: "text-amber-400",
    welcome:
      "Hello! I'm your Inventory AI Assistant. I can help you with stock levels, procurement, fulfillment, and warehouse management. What do you need?",
    suggestions: [
      "Which products are low on stock?",
      "What purchase orders are pending?",
      "Show me stock levels for critical items",
      "What's the fulfillment pipeline status?",
    ],
  },
};

// ─── Markdown Renderer (lightweight, no external deps) ───────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ml-4 mb-2 space-y-0.5 list-disc">
          {listItems.map((item, i) => (
            <li key={i} className="text-[13px] leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const renderInline = (s: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /\*\*(.*?)\*\*|`([^`]+)`/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        parts.push(s.slice(lastIndex, match.index));
      }
      if (match[1]) {
        parts.push(
          <strong key={match.index} className="font-semibold">
            {match[1]}
          </strong>,
        );
      } else if (match[2]) {
        parts.push(
          <code
            key={match.index}
            className="rounded bg-[var(--shell-bg)] px-1 py-0.5 text-[12px] font-mono"
          >
            {match[2]}
          </code>,
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < s.length) {
      parts.push(s.slice(lastIndex));
    }
    return parts.length > 0 ? parts : s;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={i} className="text-[13px] font-bold mt-2 mb-1">
          {trimmed.slice(4)}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h3 key={i} className="text-[14px] font-bold mt-3 mb-1">
          {trimmed.slice(3)}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h2 key={i} className="text-[15px] font-bold mt-3 mb-1">
          {trimmed.slice(2)}
        </h2>,
      );
      continue;
    }

    if (trimmed === "") {
      flushList();
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    flushList();
    elements.push(
      <p key={i} className="text-[13px] leading-relaxed mb-1.5 min-h-[1em]">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{elements}</>;
}

// ─── Component ───────────────────────────────────────────────────────

export function AIChat({ module, apiBase = "", className }: AIChatProps) {
  const meta = MODULE_META[module];

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const [loadedSessions, setLoadedSessions] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<DynamicSuggestion[]>([]);
  const [contextSummary, setContextSummary] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const base = apiBase.replace(/\/+$/, "");

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
      setLoadedSessions(true);
    } catch {
      // Silently fail
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
      setContextSummary(data?.context_summary || null);
    } catch {
      // Fall back to static suggestions
    }
  }, [module]);

  useEffect(() => {
    if (messages.length === 0) {
      fetchDynamicSuggestions();
    }
  }, [messages.length, fetchDynamicSuggestions]);

  // Fetch analytics (lazy — only when panel opened)
  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await api.get<AnalyticsData>("/ai/analytics/overview");
      setAnalytics(data);
    } catch {
      // ignore
    }
  }, []);

  // Load session history
  const loadSession = useCallback(
    async (sid: string) => {
      try {
        const data = await api.get<{ messages: AIChatMessage[] }>(`/ai/history/${sid}`);
        setMessages(data?.messages || []);
        setSessionId(sid);
        setShowSessionList(false);
      } catch {
        // fallback
      }
    },
    [],
  );

  // Start new chat
  const newChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setInput("");
    setShowSessionList(false);
    fetchDynamicSuggestions();
    textareaRef.current?.focus();
  }, [fetchDynamicSuggestions]);

  // Delete session
  const deleteSession = useCallback(
    async (sid: string) => {
      try {
        await api.delete(`/ai/sessions/${sid}`);
        setSessions((prev) => prev.filter((s) => s.id !== sid));
        if (sessionId === sid) {
          newChat();
        }
      } catch {
        // ignore
      }
    },
    [sessionId, newChat],
  );

  // Send message (non-streaming fallback)
  const sendMessageNonStreaming = useCallback(
    async (msg: string) => {
      const userMsg: AIChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const data = await api.post<any>("/ai/chat", {
          message: msg,
          session_id: sessionId,
          module,
          stream: false,
        });

        const assistantMsg: AIChatMessage = {
          id: data.message?.id || `asst-${Date.now()}`,
          role: "assistant",
          content: data.message?.content || data.message || "No response.",
          created_at: data.message?.created_at,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.session_id && !sessionId) {
          setSessionId(data.session_id);
          fetchSessions();
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "AI service temporarily unavailable.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${errorMsg}`,
          },
        ]);
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [sessionId, module, fetchSessions],
  );

  // Send message with SSE streaming
  const sendMessageStreaming = useCallback(
    async (msg: string) => {
      const userMsg: AIChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
      };
      const assistantId = `asst-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setLoading(true);

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
                      m.id === assistantId ? { ...m, streaming: false } : m,
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
                // skip malformed JSON
              }
            }
          }
        }

        if (newSessionId && !sessionId) {
          setSessionId(newSessionId);
          fetchSessions();
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "AI service temporarily unavailable.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠️ ${errorMsg}`, streaming: false }
              : m,
          ),
        );
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [sessionId, module, fetchSessions],
  );

  // Main send — tries streaming first, falls back to non-streaming
  const sendMessage = useCallback(
    async (text?: string) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;
      setInput("");
      await sendMessageStreaming(msg);
    },
    [input, loading, sendMessageStreaming],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;
  const displaySuggestions = dynamicSuggestions.length > 0
    ? dynamicSuggestions.map((s) => s.text)
    : meta.suggestions;

  return (
    <div className={cn("flex flex-col h-full", className)} role="main" aria-label={meta.title}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 sm:px-4 py-3 shrink-0"
        role="banner"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--shell-primary)] text-sm text-white"
            aria-hidden="true"
          >
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--shell-foreground)] truncate">
              {meta.title}
            </h1>
            <p className="text-[10px] text-[var(--shell-muted)] hidden sm:block">
              Module-aware · Powered by Groq
              {contextSummary && (
                <span className="ml-1 text-[var(--shell-accent)]">· {contextSummary}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Analytics toggle */}
          <button
            type="button"
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              if (!showAnalytics) fetchAnalytics();
            }}
            className={cn(
              "rounded-md p-1.5 transition-colors cursor-pointer",
              showAnalytics
                ? "bg-[var(--shell-primary)] text-white"
                : "text-[var(--shell-muted)] hover:bg-[var(--shell-bg)]",
            )}
            aria-label="Toggle analytics panel"
            aria-pressed={showAnalytics}
          >
            <BarChart3 size={14} />
          </button>

          {/* Session selector */}
          {loadedSessions && sessions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSessionList(!showSessionList)}
                className="flex items-center gap-1.5 rounded-md border border-[var(--shell-border)] px-2 py-1 text-[11px] text-[var(--shell-muted)] hover:bg-[var(--shell-bg)] transition-colors cursor-pointer"
                aria-label={`${sessions.length} past sessions`}
                aria-expanded={showSessionList}
                aria-haspopup="listbox"
              >
                <MessageSquare size={12} />
                <span className="hidden sm:inline">{sessions.length} sessions</span>
                <ChevronDown size={12} />
              </button>

              {showSessionList && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-[var(--shell-border)] bg-[var(--shell-surface)] shadow-lg overflow-hidden"
                  role="listbox"
                  aria-label="Past sessions"
                >
                  <div className="p-2 border-b border-[var(--shell-border)]">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--shell-muted)]">
                      Past Sessions
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        role="option"
                        aria-selected={s.id === sessionId}
                        className={cn(
                          "group flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--shell-bg)] transition-colors cursor-pointer",
                          s.id === sessionId && "bg-[var(--shell-bg)]",
                        )}
                      >
                        <button
                          type="button"
                          className="flex-1 text-left truncate"
                          onClick={() => loadSession(s.id)}
                        >
                          {s.title}
                          <span className="ml-1 text-[var(--shell-muted)]">
                            ({s.message_count})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(s.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[var(--shell-muted)] hover:text-red-400 transition-opacity ml-2 cursor-pointer"
                          aria-label={`Delete session: ${s.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={newChat}
            className="flex items-center gap-1.5 rounded-md border border-[var(--shell-border)] px-2 sm:px-2.5 py-1 text-[11px] font-medium text-[var(--shell-muted)] hover:bg-[var(--shell-bg)] transition-colors cursor-pointer"
            aria-label="Start new chat"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* ── Analytics Panel ────────────────────────────────────────── */}
      {showAnalytics && analytics && (
        <div
          className="shrink-0 border-b border-[var(--shell-border)] bg-[var(--shell-surface)] px-4 py-3"
          role="region"
          aria-label="Usage analytics"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--shell-muted)]">
              Usage Analytics
            </span>
            <button
              type="button"
              onClick={() => setShowAnalytics(false)}
              className="text-[var(--shell-muted)] hover:text-[var(--shell-foreground)] cursor-pointer"
              aria-label="Close analytics"
            >
              <X size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--shell-foreground)]">
                {analytics.total_messages}
              </div>
              <div className="text-[10px] text-[var(--shell-muted)]">Total Messages</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--shell-foreground)]">
                {analytics.total_sessions}
              </div>
              <div className="text-[10px] text-[var(--shell-muted)]">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--shell-foreground)]">
                {analytics.messages_today}
              </div>
              <div className="text-[10px] text-[var(--shell-muted)]">Today</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[var(--shell-foreground)]">
                {analytics.avg_response_time_ms > 0
                  ? `${(analytics.avg_response_time_ms / 1000).toFixed(1)}s`
                  : "—"}
              </div>
              <div className="text-[10px] text-[var(--shell-muted)]">Avg Response</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Messages Area ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12">
            <div className="text-4xl mb-4" aria-hidden="true">{meta.icon}</div>
            <h2 className="text-sm font-semibold text-[var(--shell-foreground)] mb-2">
              Welcome to {meta.title}
            </h2>
            <p className="text-xs text-[var(--shell-muted)] max-w-md mb-6 leading-relaxed px-4">
              {meta.welcome}
            </p>

            {/* Suggestion chips */}
            <div
              className="flex flex-wrap justify-center gap-2 max-w-lg px-4"
              role="group"
              aria-label="Suggested prompts"
            >
              {displaySuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-[var(--shell-border)] bg-[var(--shell-surface)] px-3 py-1.5 text-[11px] text-[var(--shell-muted)] hover:bg-[var(--shell-bg)] hover:text-[var(--shell-foreground)] transition-colors cursor-pointer"
                >
                  {dynamicSuggestions[i]?.icon && (
                    <span className="mr-1">{dynamicSuggestions[i].icon}</span>
                  )}
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2.5 items-start",
              msg.role === "user" ? "flex-row-reverse" : "",
              msg.role === "system" && "justify-center",
            )}
            role="article"
            aria-label={`${msg.role} message`}
          >
            {msg.role !== "system" && (
              <div
                className={cn(
                  "p-1.5 rounded-full shrink-0 mt-0.5",
                  msg.role === "user"
                    ? "bg-[var(--shell-primary)] text-white"
                    : "bg-[var(--shell-bg)] text-[var(--shell-muted)]",
                )}
                aria-hidden="true"
              >
                {msg.role === "user" ? <User size={12} /> : <Bot size={12} />}
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 max-w-[85%] sm:max-w-[80%]",
                msg.role === "user"
                  ? "bg-[var(--shell-primary)] text-white rounded-tr-none"
                  : msg.role === "system"
                    ? "bg-[var(--shell-bg)] text-[var(--shell-muted)] text-xs italic"
                    : "bg-[var(--shell-surface)] border border-[var(--shell-border)] text-[var(--shell-foreground)] rounded-tl-none",
              )}
            >
              {msg.content ? renderMarkdown(msg.content) : msg.streaming ? (
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
                  <span className="ml-1.5 text-[11px] text-[var(--shell-muted)]">
                    Thinking...
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {/* Typing indicator (for non-streaming mode) */}
        {loading && messages.length > 0 && !messages[messages.length - 1]?.streaming && (
          <div className="flex gap-2.5 items-start" aria-label="AI is typing" role="status">
            <div className="p-1.5 rounded-full bg-[var(--shell-bg)] text-[var(--shell-muted)] mt-0.5">
              <Bot size={12} />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-[var(--shell-surface)] border border-[var(--shell-border)]">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-[var(--shell-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
                <span className="ml-1.5 text-[11px] text-[var(--shell-muted)]">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────────────── */}
      <footer
        className="shrink-0 border-t border-[var(--shell-border)] bg-[var(--shell-surface)] p-3"
        role="form"
        aria-label="Message input"
      >
        <div className="flex gap-2 items-end">
          <label htmlFor={`chat-input-${module}`} className="sr-only">
            Type your message
          </label>
          <textarea
            id={`chat-input-${module}`}
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything about ${module === "admin" ? "your ERP system" : module}...`}
            rows={1}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-[var(--shell-border)] bg-[var(--shell-bg)] px-3 py-2 text-[13px] text-[var(--shell-foreground)] placeholder:text-[var(--shell-muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--shell-primary)] disabled:opacity-50 max-h-24"
            style={{ minHeight: "38px" }}
            aria-describedby={`chat-hint-${module}`}
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-[var(--shell-primary)] text-white transition-colors hover:bg-[var(--shell-primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p
          id={`chat-hint-${module}`}
          className="text-[9px] text-[var(--shell-muted)]/60 mt-1.5 text-center"
        >
          Shift+Enter for new line · Enter to send
        </p>
      </footer>
    </div>
  );
}
