import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, TrendingUp, AlertCircle, HelpCircle, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import aiService from "../services/aiService";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "ai", content: "Hello! I'm your AI business copilot. I am now fully context-aware of your live data! Try asking about your low stock products, overdue invoices, or top customers." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchInsights();
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInsights = async () => {
    try {
      const res = await aiService.getInsights();
      setInsights(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await aiService.getConversations();
      setConversations(res.data.conversations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversation = async (id) => {
    try {
      setLoading(true);
      setCurrentConversationId(id);
      const res = await aiService.getConversationHistory(id);
      
      const loadedMessages = (res.data.messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));
      setMessages(loadedMessages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([
      { role: "ai", content: "Hello! I'm your AI business copilot. I am now fully context-aware of your live data! Try asking about your low stock products, overdue invoices, or top customers." }
    ]);
  };

  const handleSend = async (overrideMessage) => {
    const messageToSend = overrideMessage || input;
    if (!messageToSend.trim()) return;

    const newMessages = [...messages, { role: "user", content: messageToSend }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await aiService.chat(messageToSend, currentConversationId);
      setMessages([...newMessages, { role: "ai", content: res.data.response }]);
      
      // If it's a new conversation, save the ID and refresh the list
      if (!currentConversationId && res.data.conversation_id) {
        setCurrentConversationId(res.data.conversation_id);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: "ai", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedPrompts = [
    "Today's Profit",
    "Outstanding Invoices",
    "Low Stock Products",
    "Revenue This Month",
    "Top Customers",
    "Open Leads"
  ];

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="page__header" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', backgroundColor: '#0f172a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--foreground)' }}>AI Copilot</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>Your intelligent, context-aware business assistant</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '600px' }}>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row' }}>
              <CardTitle>Chat with AI</CardTitle>
              {currentConversationId && (
                <Button variant="outline" onClick={startNewConversation} style={{ height: '32px', fontSize: '13px' }}>
                  <Plus size={14} style={{ marginRight: '6px' }} /> New Chat
                </Button>
              )}
            </CardHeader>
            <CardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
                {(messages || []).map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '16px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    {msg.role === 'ai' || msg.role === 'assistant' ? (
                      <div style={{ width: '32px', height: '32px', minWidth: '32px', backgroundColor: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Sparkles size={16} />
                      </div>
                    ) : null}
                    <div style={{ 
                      backgroundColor: msg.role === 'user' ? '#0f172a' : 'var(--muted)', 
                      color: msg.role === 'user' ? 'white' : 'var(--foreground)',
                      padding: '16px', 
                      borderRadius: '12px', 
                      maxWidth: '80%',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#0f172a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Sparkles size={16} />
                    </div>
                    <div style={{ backgroundColor: 'var(--muted)', padding: '16px', borderRadius: '12px' }}>
                      <Spinner size="sm" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Ask me anything about your business..." 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  style={{ 
                    flex: 1, 
                    height: '48px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)', 
                    padding: '0 16px', 
                    backgroundColor: 'var(--muted)',
                    outline: 'none'
                  }} 
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '8px', 
                    backgroundColor: '#0f172a', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                    opacity: loading || !input.trim() ? 0.7 : 1
                  }}
                >
                  <Send size={20} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested Prompts</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(suggestedPrompts || []).map((prompt, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSend(prompt)}
                  style={{ 
                    padding: '12px 16px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {prompt}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {conversations.length > 0 ? (conversations || []).map((conv, idx) => (
                <div 
                  key={idx} 
                  onClick={() => loadConversation(conv.id)}
                  style={{ 
                    padding: '12px 16px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: currentConversationId === conv.id ? 'var(--muted)' : 'transparent'
                  }}
                  onMouseOver={(e) => { if(currentConversationId !== conv.id) e.currentTarget.style.backgroundColor = 'var(--muted)' }}
                  onMouseOut={(e) => { if(currentConversationId !== conv.id) e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.title}</h4>
                  <p style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{new Date(conv.updated_at).toLocaleDateString()}</p>
                </div>
              )) : (
                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>No recent conversations.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {insights?.insights?.map(insight => (
                <div key={insight.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    backgroundColor: insight.type === 'success' ? '#dcfce7' : insight.type === 'warning' ? '#ffedd5' : '#e0e7ff',
                    color: insight.type === 'success' ? '#16a34a' : insight.type === 'warning' ? '#ea580c' : '#4f46e5'
                  }}>
                    {insight.type === 'success' ? <TrendingUp size={16} /> : insight.type === 'warning' ? <AlertCircle size={16} /> : <HelpCircle size={16} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{insight.title}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: '1.5' }}>{insight.description}</p>
                  </div>
                </div>
              )) || <Spinner size="sm" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              {insights?.health_score ? (
                <>
                  <div style={{ textAlign: 'center', padding: '24px 0', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '48px', fontWeight: 700 }}>{insights.health_score.overall}</h2>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>{insights.health_score.label}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(insights.health_score.metrics).map(([key, value]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>{key}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: value >= 80 ? 'var(--success)' : value >= 60 ? 'var(--warning)' : 'var(--destructive)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <Spinner size="sm" />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
