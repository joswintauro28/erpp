"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { MessageCircle, Send, Sparkles, Trash2, Bot, User, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import AiAssistantLoading from "./loading";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Success: "default",
  Failed: "destructive",
};

export default function AiAssistantPage() {
  const [data, setData] = useState({ summary: { total_ai_logs: 0, open: 0, overdue_at_risk: 0, owners: 0 }, ai_logs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"logs" | "chat">("chat");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello! I am your CRM AI Assistant. How can I help you analyze data, draft client responses, or check details today?" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "How many active customers do we have?",
    "Summarize the pipeline status.",
    "Draft a professional thank-you email for a new sale.",
    "What are some tips to convert proposal stage opportunities?",
  ];

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [chatHistory, chatLoading]);

  const fetchData = useCallback(async () => {
    try { const result = await api.get<any>("/crm/ai-assistant"); setData(result); } catch {}
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleChat = async (text?: string) => {
    const msg = text || chatInput;
    if (!msg.trim() || chatLoading) return;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const history = chatHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post<any>("/crm/ai-assistant/chat", { message: msg, history });
      setChatHistory(prev => [...prev, { role: "assistant", content: res.response }]);
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Failed to get response. Ensure the backend is running." }]);
    } finally { setChatLoading(false); }
  };

  const handleClear = () => { setChatHistory([{ role: "assistant", content: "Chat cleared. How can I help you now?" }]); };

  const formatContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const bolded = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return <li key={i} className="ml-6 mb-1 list-disc text-sm" dangerouslySetInnerHTML={{ __html: bolded.substring(2) }} />;
      }
      return <p key={i} className="m-0 mb-2 text-sm min-h-[1em]" dangerouslySetInnerHTML={{ __html: bolded }} />;
    });
  };

  if (loading) return <div className="flex h-full items-center justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-10 lg:space-y-12">
      <div>
        <div className="mb-5 flex items-center gap-2">
          <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">AI Assistant</h2>
          <div className="h-px flex-1 bg-[--shell-border]" />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex rounded-lg border border-[--shell-border] overflow-hidden">
            <button onClick={() => setActiveTab("chat")} className={cn("px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors", activeTab === "chat" ? "bg-primary text-primary-foreground" : "text-[--shell-muted] hover:text-[--shell-foreground]")}>Chat</button>
            <button onClick={() => setActiveTab("logs")} className={cn("px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors", activeTab === "logs" ? "bg-primary text-primary-foreground" : "text-[--shell-muted] hover:text-[--shell-foreground]")}>Logs</button>
          </div>
          <Button variant="outline" size="sm" onClick={handleClear}><Trash2 size={14} className="mr-1.5" /> Clear Chat</Button>
        </div>

        {activeTab === "logs" && (
          <>
            <div className="mb-5 flex items-center gap-2">
              <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Overview</h2>
              <div className="h-px flex-1 bg-[--shell-border]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">Total Logs</p>
                <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.total_ai_logs}</p>
              </div>
              <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">Success</p>
                <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.open}</p>
              </div>
              <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">Failed</p>
                <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.overdue_at_risk}</p>
              </div>
              <div className="rounded-xl border border-[--shell-border] bg-[--shell-surface] p-4 space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[--shell-muted]">Owners</p>
                <p className="font-heading text-2xl font-semibold tracking-tight text-[--shell-foreground]">{data.summary.owners}</p>
              </div>
            </div>
            <div className="mb-5 flex items-center gap-2">
              <h2 className="font-heading text-xs font-light uppercase tracking-[0.12em] text-[--shell-muted]">Logs</h2>
              <div className="h-px flex-1 bg-[--shell-border]" />
            </div>
            <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
              <div className="flex items-center gap-3 p-4 border-b border-[--shell-border]">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--shell-muted]" />
                  <Input placeholder="Search logs..." className="pl-9 h-9 text-sm" />
                </div>
                <Filter size={15} className="text-[--shell-muted] shrink-0" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Query</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ai_logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-[--shell-muted]">{log.id_str}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{log.query}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-[--shell-muted]">{(log.response || "").substring(0, 100)}</TableCell>
                      <TableCell>{log.category}</TableCell>
                      <TableCell><Badge variant={statusVariant[log.status] || "outline"}>{log.status}</Badge></TableCell>
                      <TableCell className="text-[--shell-muted]">{log.created_at}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {activeTab === "chat" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[480px]">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3 items-start", msg.role === "user" ? "flex-row-reverse" : "")}>
                    <div className={cn("p-2 rounded-full shrink-0", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-[--shell-bg] text-accent")}>
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={cn("px-4 py-2.5 rounded-2xl max-w-[80%] text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-[--shell-bg] text-[--shell-foreground] rounded-tl-none")}>
                      {formatContent(msg.content)}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex gap-3 items-start">
                    <div className="p-2 rounded-full bg-[--shell-bg] text-accent shrink-0"><Bot size={14} /></div>
                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-none bg-[--shell-bg] text-[--shell-muted] text-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[--shell-muted] rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                        <span className="w-1.5 h-1.5 bg-[--shell-muted] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1.5 h-1.5 bg-[--shell-muted] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                        <span className="ml-2 text-xs text-[--shell-muted]">Assistant is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-[--shell-border] bg-[--shell-bg]/30">
                <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="flex gap-3">
                  <Input placeholder="Ask anything about customers, pipelines, draft replies..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading} className="flex-1" />
                  <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                    <Send size={14} className="mr-1.5" /> Send
                  </Button>
                </form>
              </div>
            </Card>
            <div className="space-y-3">
              <Card className="hover:shadow-md transition-shadow duration-200 border-[--shell-border] bg-[--shell-surface]">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-[--shell-foreground] flex items-center gap-1.5 mb-3">
                    <Bot size={14} className="text-accent" /> Quick Suggestions
                  </h4>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleChat(s)} disabled={chatLoading} className="w-full text-left text-xs px-3 py-2 rounded-md border border-[--shell-border] bg-[--shell-bg]/50 text-[--shell-foreground] hover:bg-[--shell-bg] transition-colors cursor-pointer disabled:opacity-50">
                        {s}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
