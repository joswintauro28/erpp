import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2, Bot, User } from 'lucide-react';

const AIAssistantManagement = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your CRM AI Assistant. How can I help you analyze data, draft client responses, or check details today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    if (!textToSend) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setLoading(true);

    try {
      // Map history to backend format
      const history = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/ai-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: history
        })
      });

      if (res.ok) {
        const result = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error communicating with the server.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please make sure the backend server is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I help you now?'
      }
    ]);
  };

  const suggestions = [
    "How many active customers do we have?",
    "Summarize the pipeline status.",
    "Draft a professional thank-you email for a new sale.",
    "What are some tips to convert proposal stage opportunities?"
  ];

  // Helper to parse simple markdown formatting (bold, bullet points, linebreaks)
  const formatMessageContent = (text) => {
    return text.split('\n').map((line, index) => {
      let formattedLine = line;
      // Bold syntax **text** -> <strong>text</strong>
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (formattedLine.trim().startsWith('- ') || formattedLine.trim().startsWith('* ')) {
        return (
          <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem', listStyleType: 'disc' }} dangerouslySetInnerHTML={{ __html: formattedLine.substring(2) }} />
        );
      }
      return (
        <p key={index} style={{ margin: '0 0 0.5rem 0', minHeight: '1em' }} dangerouslySetInnerHTML={{ __html: formattedLine }} />
      );
    });
  };

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
      {/* Header */}
      <div className="customer-header" style={{ flexShrink: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        <div className="welcome-msg" style={{ marginBottom: 0 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>INSIGHTS</div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} color="var(--accent-primary)" /> AI Assistant
          </h2>
          <p>Real-time analytics and assistance powered by Groq LLM.</p>
        </div>
        <button 
          onClick={handleClear}
          className="btn"
          style={{ 
            backgroundColor: 'white', 
            border: '1px solid var(--border-color)', 
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.45rem 0.75rem',
            fontSize: '0.8125rem'
          }}
        >
          <Trash2 size={14} /> Clear Chat
        </button>
      </div>

      {/* Main Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', flex: 1, minHeight: 0 }}>
        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          {/* Scrollable Messages Container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.map((msg, i) => (
              <div 
                key={i} 
                style={{ 
                  display: 'flex', 
                  gap: '0.75rem', 
                  alignItems: 'flex-start',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                {msg.role !== 'user' && (
                  <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={16} />
                  </div>
                )}
                
                <div style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '0 16px 16px 16px',
                  backgroundColor: msg.role === 'user' ? 'var(--accent-primary, #991b1b)' : 'var(--bg-secondary, #f8fafc)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-main, #1e293b)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  fontSize: '0.875rem',
                  lineHeight: '1.5'
                }}>
                  {formatMessageContent(msg.content)}
                </div>

                {msg.role === 'user' && (
                  <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', alignSelf: 'flex-start' }}>
                <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={16} />
                </div>
                <div style={{ padding: '0.85rem 1.1rem', borderRadius: '0 16px 16px 16px', backgroundColor: 'var(--bg-secondary, #f8fafc)', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0s', width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%' }}></span>
                    <span style={{ animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s', width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%' }}></span>
                    <span style={{ animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s', width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%' }}></span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>Assistant is typing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
              style={{ display: 'flex', gap: '0.75rem' }}
            >
              <input
                type="text"
                placeholder="Ask anything about active customers, sales pipelines, draft replies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: '#ffffff' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
              <Bot size={16} color="var(--accent-primary)" /> Quick Suggestions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    color: 'var(--text-main, #1e293b)',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    hover: { backgroundColor: '#f1f5f9' }
                  }}
                  className="dropdown-item"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantManagement;
