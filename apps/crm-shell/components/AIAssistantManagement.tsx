"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Trash2, Bot, User } from "lucide-react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantManagement() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your CRM AI Assistant. How can I help you analyze data, draft client responses, or check details today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    if (!textToSend) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await api.post<{ response: string }>(
        "/ai-assistant/chat",
        {
          message: prompt,
          history,
        },
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error communicating with the server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you now?",
      },
    ]);
  };

  const suggestions = [
    "How many active customers do we have?",
    "Summarize the pipeline status.",
    "Draft a professional thank-you email for a new sale.",
    "What are some tips to convert proposal stage opportunities?",
  ];

  const formatMessageContent = (text: string) => {
    return text.split("\n").map((line, index) => {
      let formattedLine = line;
      formattedLine = formattedLine.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>",
      );
      if (
        formattedLine.trim().startsWith("- ") ||
        formattedLine.trim().startsWith("* ")
      ) {
        return (
          <li
            key={index}
            style={{
              marginLeft: "1.5rem",
              marginBottom: "0.25rem",
              listStyleType: "disc",
            }}
            dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }}
          />
        );
      }
      return (
        <p
          key={index}
          style={{ margin: "0 0 0.5rem 0", minHeight: "1em" }}
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
      <div
        className="flex-shrink-0 pb-4 mb-4 flex items-start justify-between"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            INSIGHTS
          </div>
          <h2 className="flex items-center gap-2">
            <Sparkles size={24} color="var(--accent-primary)" /> AI Assistant
          </h2>
          <p>Real-time analytics and assistance powered by Groq LLM.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleClear}
          className="flex items-center gap-1 text-red-700"
          style={{ padding: "0.45rem 0.75rem", fontSize: "0.8125rem" }}
        >
          <Trash2 size={14} /> Clear Chat
        </Button>
      </div>

      <div
        className="grid flex-1 min-h-0"
        style={{
          gridTemplateColumns: "1fr 280px",
          gap: "1.5rem",
        }}
      >
        <div
          className="flex flex-col overflow-hidden rounded-xl bg-white"
          style={{ border: "1px solid var(--border-color)" }}
        >
          <div
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-5"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                {msg.role !== "user" && (
                  <div
                    style={{
                      padding: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-secondary)",
                      color: "var(--accent-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Bot size={16} />
                  </div>
                )}

                <div
                  style={{
                    padding: "0.85rem 1.1rem",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 0 16px"
                        : "0 16px 16px 16px",
                    backgroundColor:
                      msg.role === "user"
                        ? "var(--accent-primary, #991b1b)"
                        : "var(--bg-secondary, #f8fafc)",
                    color:
                      msg.role === "user"
                        ? "#ffffff"
                        : "var(--text-main, #1e293b)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                    fontSize: "0.875rem",
                    lineHeight: "1.5",
                  }}
                >
                  {formatMessageContent(msg.content)}
                </div>

                {msg.role === "user" && (
                  <div
                    style={{
                      padding: "0.5rem",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-primary)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  alignSelf: "flex-start",
                }}
              >
                <div
                  style={{
                    padding: "0.5rem",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Bot size={16} />
                </div>
                <div
                  style={{
                    padding: "0.85rem 1.1rem",
                    borderRadius: "0 16px 16px 16px",
                    backgroundColor: "var(--bg-secondary, #f8fafc)",
                    color: "var(--text-muted)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "0.25rem",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: "0s",
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#94a3b8",
                        borderRadius: "50%",
                      }}
                    />
                    <span
                      style={{
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: "0.2s",
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#94a3b8",
                        borderRadius: "50%",
                      }}
                    />
                    <span
                      style={{
                        animation: "bounce 1.4s infinite ease-in-out",
                        animationDelay: "0.4s",
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#94a3b8",
                        borderRadius: "50%",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#94a3b8",
                        marginLeft: "0.5rem",
                      }}
                    >
                      Assistant is typing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div
            className="p-4 border-t"
            style={{
              borderTopColor: "var(--border-color)",
              backgroundColor: "var(--bg-secondary, #f8fafc)",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <Input
                type="text"
                placeholder="Ask anything about active customers, sales pipelines, draft replies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
              >
                <Send size={14} /> Send
              </Button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1 text-sm">
                <Bot size={16} color="var(--accent-primary)" /> Quick Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {suggestions.map((s, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto"
                  onClick={() => handleSend(s)}
                  disabled={loading}
                >
                  {s}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
