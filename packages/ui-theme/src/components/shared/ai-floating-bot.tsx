"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Square,
  Copy,
  Check,
  Bot,
  User,
  Plus,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { API_BASE, getAccessToken } from "@datavex/auth-middleware";
import { AIModule, MODULE_META } from "./ai-chat";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";

export interface AIFloatingBotProps {
  /** Default module context (admin | crm | billing | inventory) */
  defaultModule?: AIModule;
  /** Custom position class (default: fixed bottom-6 right-6 z-50) */
  positionClassName?: string;
  /** Storage key to persist open state */
  persistKey?: string;
}

interface FloatingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS: Record<AIModule, Array<{ text: string; icon: string }>> = {
  crm: [
    { text: "Show top leads by score", icon: "🎯" },
    { text: "What is our pipeline value?", icon: "💰" },
    { text: "Draft client follow-up email", icon: "✉️" },
  ],
  billing: [
    { text: "Analyze overdue invoices", icon: "⏳" },
    { text: "GST liability breakdown", icon: "📑" },
    { text: "Recent payment trends", icon: "💵" },
  ],
  inventory: [
    { text: "Critically low stock items", icon: "⚠️" },
    { text: "Pending purchase orders", icon: "🚚" },
    { text: "Warehouse stock distribution", icon: "🏭" },
  ],
  admin: [
    { text: "Cross-module system overview", icon: "📊" },
    { text: "Items needing urgent attention", icon: "⚠️" },
    { text: "Quarter business performance", icon: "📈" },
  ],
};

function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="ml-3 my-1.5 space-y-0.5 list-disc text-muted-foreground text-[12px]">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-foreground leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const renderInline = (s: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`|₹[\d,.]+|\$[\d,.]+)/g;
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
            className="rounded bg-muted px-1 py-0.2 text-[11px] font-mono text-[var(--shell-brand)] dark:text-[var(--shell-accent)] border border-border"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else if (token.startsWith("₹") || token.startsWith("$")) {
        parts.push(
          <span
            key={match.index}
            className="font-medium text-[var(--shell-brand)] dark:text-[var(--shell-accent)] bg-[var(--shell-brand)]/10 dark:bg-[var(--shell-brand)]/20 px-1 py-0.2 rounded"
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

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        flushList();
        elements.push(
          <pre key={`code-${elements.length}`} className="my-1.5 p-2.5 rounded-lg bg-muted border border-border text-[11px] font-mono overflow-x-auto text-foreground">
            <code>{codeBuffer.join("\n")}</code>
          </pre>,
        );
        inCodeBlock = false;
        codeBuffer = [];
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed.startsWith("### ") || trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      flushList();
      const headingText = trimmed.replace(/^#+\s*/, "");
      elements.push(
        <div key={i} className="font-semibold text-foreground text-xs mt-2 mb-0.5">
          {headingText}
        </div>,
      );
      continue;
    }

    if (trimmed === "") {
      flushList();
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    flushList();
    elements.push(
      <p key={i} className="text-[12px] leading-relaxed mb-1 min-h-[1em]">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{elements}</>;
}

export function AIFloatingBot({
  defaultModule = "admin",
  positionClassName = "fixed bottom-6 right-6 z-50",
}: AIFloatingBotProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<FloatingMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (pathname && pathname.includes("/ai-assistant")) {
    return null;
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, loading, isOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setSessionId(null);
    setInput("");
    setLoading(false);
    setStreaming(false);
    inputRef.current?.focus();
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  };

  const handleSend = async (customText?: string) => {
    const prompt = (customText || input).trim();
    if (!prompt || loading) return;

    setInput("");
    const userMsg: FloatingMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: prompt,
    };
    const asstId = `a-${Date.now()}`;
    const asstMsg: FloatingMessage = {
      id: asstId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, asstMsg]);
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

      const res = await fetch(`${API_BASE}/ai/chat/stream`, {
        method: "POST",
        headers,
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          message: prompt,
          session_id: sessionId,
          module: defaultModule,
          stream: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.session_id && !sessionId) {
                setSessionId(data.session_id);
              }
              if (data.content) {
                fullContent += data.content;
                const snapshot = fullContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstId ? { ...m, content: snapshot } : m,
                  ),
                );
              }
              if (data.output_tokens !== undefined) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === asstId ? { ...m, streaming: false } : m,
                  ),
                );
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId
              ? { ...m, content: "⚠️ AI copilot temporarily unavailable.", streaming: false }
              : m,
          ),
        );
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const meta = MODULE_META[defaultModule] || MODULE_META.admin;
  const quickPrompts = QUICK_PROMPTS[defaultModule] || QUICK_PROMPTS.admin;

  return (
    <div className={cn(positionClassName, "font-sans select-none")}>
        {isOpen ? (
          <div
            className={cn(
              "flex flex-col bg-card border border-border shadow-2xl overflow-hidden transition-all duration-300 ease-in-out select-text animate-in fade-in slide-in-from-bottom-5 duration-200",
              isMaximized
                ? "fixed inset-4 sm:inset-10 z-50 rounded-2xl"
                : "w-[92vw] sm:w-[400px] h-[520px] max-h-[82vh] rounded-2xl",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-card/95 border-b border-border select-none shrink-0 backdrop-blur-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 rounded-lg bg-[var(--shell-brand)]/15 text-[var(--shell-brand)] dark:text-[var(--shell-accent)] border border-[var(--shell-brand)]/25">
                  <AvatarFallback className="bg-transparent text-[var(--shell-brand)] dark:text-[var(--shell-accent)]">
                    <Sparkles size={14} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    DATAVEX Copilot
                  </span>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-medium uppercase tracking-wider", meta.badgeColor)}>
                    {meta.shortTitle}
                  </Badge>
                </div>
              </div>

              {/* Window Controls using Shadcn Buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                  title="New conversation"
                >
                  <Plus size={14} />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="text-muted-foreground hover:text-foreground"
                  title={isMaximized ? "Restore size" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Close (Ctrl+J)"
                >
                  <X size={14} />
                </Button>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar bg-background">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-6 px-3">
                  <Avatar className="h-11 w-11 rounded-2xl bg-[var(--shell-brand)]/10 border border-[var(--shell-brand)]/20 mb-2.5 shadow-2xs">
                    <AvatarFallback className="bg-transparent text-[var(--shell-brand)] dark:text-[var(--shell-accent)] text-xl">
                      {meta.icon}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-xs font-semibold text-foreground mb-1">
                    How can I help you with {meta.shortTitle.replace(/\s*AI\s*/i, "")}?
                  </div>
                  <div className="text-[11px] text-muted-foreground max-w-xs leading-relaxed mb-4">
                    Ask questions or query live {meta.shortTitle.replace(/\s*AI\s*/i, "")} records.
                  </div>

                  {/* Quick Action Buttons using Shadcn Button */}
                  <div className="w-full space-y-2 text-left">
                    {quickPrompts.map((p, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => handleSend(p.text)}
                        className="w-full justify-between h-auto py-2.5 px-3 rounded-xl border border-border/80 bg-card hover:bg-accent/60 hover:border-[var(--shell-brand)]/40 font-normal text-xs text-foreground group transition-all cursor-pointer shadow-2xs"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{p.icon}</span>
                          <span className="truncate">{p.text}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Ask ↵
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex gap-2 items-start group",
                        isUser ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <Avatar
                        className={cn(
                          "h-6 w-6 rounded-md text-[10px] font-semibold mt-0.5 shadow-2xs",
                          isUser
                            ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                            : "bg-[var(--shell-brand)] text-white dark:bg-[var(--shell-brand)] dark:text-[var(--shell-accent)]",
                        )}
                      >
                        <AvatarFallback className="bg-transparent">
                          {isUser ? <User size={11} /> : <Bot size={11} />}
                        </AvatarFallback>
                      </Avatar>

                      <div className={cn("flex flex-col space-y-1 max-w-[85%]", isUser ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-xl px-3 py-2 text-[12px] leading-relaxed shadow-2xs",
                            isUser
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-xs"
                              : "bg-card border border-border text-foreground rounded-tl-xs",
                          )}
                        >
                          {m.content ? (
                            renderSimpleMarkdown(m.content)
                          ) : m.streaming ? (
                            <div className="flex items-center gap-2 py-0.5 text-[11px] text-muted-foreground animate-pulse">
                              <Sparkles size={12} className="text-[var(--shell-brand)] animate-spin" style={{ animationDuration: "3s" }} />
                              <span>Thinking...</span>
                            </div>
                          ) : null}
                        </div>

                        {!isUser && m.content && !m.streaming && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity px-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleCopy(m.id, m.content)}
                              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === m.id ? <Check size={10} className="text-emerald-500 mr-1" /> : <Copy size={10} className="mr-1" />}
                              <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Bar */}
            <div className="p-3 border-t border-border/80 bg-card/95 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center bg-muted/40 hover:bg-muted/60 border border-border focus-within:border-[var(--shell-brand)] focus-within:bg-background focus-within:ring-2 focus-within:ring-[var(--shell-brand)]/15 rounded-full pl-3.5 pr-1.5 py-1 transition-all shadow-xs"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${meta.shortTitle.replace(/\s*AI\s*/i, "")} anything...`}
                  disabled={loading}
                  style={{ outline: "none", boxShadow: "none", border: "none" }}
                  className="flex-1 bg-transparent border-0 outline-none ring-0 shadow-none text-xs text-foreground placeholder:text-muted-foreground/60 py-1.5 pr-2 focus:outline-none focus:ring-0 focus:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0"
                />

                {streaming ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    onClick={handleStop}
                    className="h-7 px-2.5 rounded-full text-[10px] gap-1 shrink-0 font-medium cursor-pointer"
                  >
                    <Square size={9} />
                    <span>Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loading || !input.trim()}
                    className="h-7 w-7 rounded-full bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white shrink-0 disabled:opacity-25 shadow-2xs cursor-pointer transition-transform active:scale-95"
                    aria-label="Send"
                  >
                    <Send size={12} />
                  </Button>
                )}
              </form>
            </div>
          </div>
        ) : (
          /* Floating Action Button (FAB) */
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="relative h-12 w-12 rounded-full bg-[var(--shell-brand)] hover:bg-[var(--shell-brand)]/90 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[var(--shell-accent)]/40 p-0 overflow-hidden cursor-pointer"
            title="AI Copilot (Ctrl+J)"
            aria-label="Open AI Copilot (Ctrl+J)"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--shell-brand)] via-[var(--shell-accent)]/20 to-[var(--shell-brand)] opacity-60 hover:opacity-100 transition-opacity" />
            <Sparkles size={20} className="relative text-[var(--shell-accent)] hover:rotate-12 transition-transform duration-300" />
          </Button>
        )}
      </div>
  );
}


