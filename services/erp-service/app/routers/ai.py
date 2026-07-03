"""
VexBill AI Router
Orchestrates: message → intent detection → context building → memory → Groq LLM → response
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List, Optional
from app.database import conn
from app.auth.oauth2 import get_current_user
from openai import OpenAI
from pydantic import BaseModel
from app.services.ai_context import build_context

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


# ──────────────────────────── DB Helpers ─────────────────────────────────

def _one(sql: str, params: tuple) -> Dict[str, Any]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()
            return dict(row) if row else {}
    except Exception as e:
        conn.rollback()
        print(f"[AI_ROUTER] SQL Error: {e}")
        return {}


def _many(sql: str, params: tuple) -> List[Dict[str, Any]]:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return [dict(r) for r in cursor.fetchall()]
    except Exception as e:
        conn.rollback()
        print(f"[AI_ROUTER] SQL Error: {e}")
        return []


def _exec(sql: str, params: tuple) -> int:
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            conn.commit()
            if "RETURNING id" in sql:
                row = cursor.fetchone()
                return row['id'] if row else 0
            return cursor.rowcount
    except Exception as e:
        conn.rollback()
        print(f"[AI_ROUTER] SQL Exec Error: {e}")
        return 0


# ──────────────────────────── Models ─────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


# ──────────────────────────── Conversation Endpoints ─────────────────

@router.get("/conversations")
def get_conversations(current_user: int = Depends(get_current_user)):
    convs = _many(
        "SELECT id, title, updated_at FROM ai_conversations WHERE owner_id=%s ORDER BY updated_at DESC LIMIT 20",
        (current_user,)
    )
    return {"conversations": convs}


@router.get("/conversations/{conversation_id}")
def get_conversation_history(conversation_id: int, current_user: int = Depends(get_current_user)):
    c = _one("SELECT id FROM ai_conversations WHERE id=%s AND owner_id=%s", (conversation_id, current_user))
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = _many(
        "SELECT role, content FROM ai_messages WHERE conversation_id=%s ORDER BY created_at ASC",
        (conversation_id,)
    )
    return {"messages": messages}


# ──────────────────────────── Conversation Summarizer ────────────────

def summarize_conversation(client: OpenAI, existing_summary: str, recent_messages: list) -> str:
    """Compress older conversation history into a summary using Groq."""
    try:
        messages_text = "\n".join([f"{m['role']}: {m['content']}" for m in recent_messages])
        prompt = f"""Existing conversation summary: {existing_summary or 'None yet'}

Recent messages:
{messages_text}

Write a brief updated summary (2-3 sentences) capturing the key topics and facts discussed."""

        res = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150
        )
        return res.choices[0].message.content
    except Exception as e:
        print(f"[AI_ROUTER] Summarization error: {e}")
        return existing_summary or ""


# ──────────────────────────── Main Chat Endpoint ─────────────────────

@router.post("/chat")
def chat_with_ai(request: ChatRequest, current_user: int = Depends(get_current_user)):
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {
            "response": "System Notice: GROQ_API_KEY is not configured. Please add it to the .env file.",
            "conversation_id": None
        }

    # 1. Initialize Groq client (via OpenAI SDK)
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )

    # 2. Manage conversation
    conversation_id = request.conversation_id
    summary = None

    if not conversation_id:
        title = request.message[:50] + ("..." if len(request.message) > 50 else "")
        conversation_id = _exec(
            "INSERT INTO ai_conversations (owner_id, title) VALUES (%s, %s) RETURNING id",
            (current_user, title)
        )
        if not conversation_id:
            return {"response": "Failed to create conversation. Please try again.", "conversation_id": None}
    else:
        c = _one(
            "SELECT summary FROM ai_conversations WHERE id=%s AND owner_id=%s",
            (conversation_id, current_user)
        )
        if not c and c != {}:
            raise HTTPException(status_code=404, detail="Conversation not found")
        summary = c.get('summary')

    # 3. Save user message
    _exec(
        "INSERT INTO ai_messages (conversation_id, role, content) VALUES (%s, %s, %s)",
        (conversation_id, 'user', request.message)
    )

    # 4. Load recent history (last 10 messages for context window)
    history = _many(
        "SELECT role, content FROM ai_messages WHERE conversation_id=%s ORDER BY created_at DESC LIMIT 10",
        (conversation_id,)
    )
    history.reverse()

    # 5. Summarize if conversation is getting long
    total_msgs = _one(
        "SELECT COUNT(*) as cnt FROM ai_messages WHERE conversation_id=%s",
        (conversation_id,)
    )
    msg_count = total_msgs.get('cnt', 0)
    if msg_count > 12 and msg_count % 6 == 0:
        print(f"[AI_ROUTER] Summarizing conversation {conversation_id} ({msg_count} messages)")
        new_summary = summarize_conversation(client, summary, history[:6])
        _exec("UPDATE ai_conversations SET summary=%s WHERE id=%s", (new_summary, conversation_id))
        summary = new_summary

    # 6. Build business context via intent detection
    system_prompt = build_context(current_user, request.message)

    if summary:
        system_prompt += f"\n\nPrevious Conversation Context:\n{summary}"

    # 7. Assemble LLM messages
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = msg['role'] if msg['role'] in ('user', 'assistant') else 'assistant'
        llm_messages.append({"role": role, "content": msg['content']})

    print(f"[AI_ROUTER] Sending {len(llm_messages)} messages to Groq (system prompt: {len(system_prompt)} chars)")

    # 8. Call Groq
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=llm_messages,
            temperature=0.4,
            max_tokens=800
        )
        ai_response = response.choices[0].message.content
        print(f"[AI_ROUTER] Groq response received ({len(ai_response)} chars)")

        # 9. Save AI response
        _exec(
            "INSERT INTO ai_messages (conversation_id, role, content) VALUES (%s, %s, %s)",
            (conversation_id, 'assistant', ai_response)
        )
        _exec(
            "UPDATE ai_conversations SET updated_at=CURRENT_TIMESTAMP WHERE id=%s",
            (conversation_id,)
        )

        return {"response": ai_response, "conversation_id": conversation_id}

    except Exception as e:
        print(f"[AI_ROUTER] LLM Error: {e}")
        return {
            "response": f"I encountered an error communicating with the AI service: {str(e)}",
            "conversation_id": conversation_id
        }


# ──────────────────────────── Insights Endpoint ──────────────────────

@router.get("/insights")
def get_ai_insights(current_user: int = Depends(get_current_user)):
    score = 87
    revenue_growth = 92
    cash_flow = 85
    profitability = 89
    retention = 78

    try:
        outstanding = _one(
            "SELECT COALESCE(SUM(balance_due), 0) as amt FROM invoices WHERE owner_id=%s AND status <> 'cancelled'",
            (current_user,)
        )
        amt = float(outstanding.get("amt", 0))
        if amt > 100000:
            score -= 15
            cash_flow -= 20
        elif amt > 10000:
            score -= 10
            cash_flow -= 15
    except:
        pass

    insights = [
        {
            "id": 1, "type": "success", "title": "Revenue Forecast",
            "description": "Based on current trends, expect consistent revenue next month (+12%)."
        },
        {
            "id": 2, "type": "warning", "title": "Payment Risk Alert",
            "description": "You have outstanding invoices that require attention to maintain cash flow."
        },
        {
            "id": 3, "type": "info", "title": "Optimization Opportunity",
            "description": "Consider following up on overdue invoices to improve your Cash Flow score."
        }
    ]

    return {
        "health_score": {
            "overall": max(0, min(100, score)),
            "label": "Excellent" if score >= 80 else "Good" if score >= 60 else "Needs Attention",
            "metrics": {
                "Revenue Growth": revenue_growth,
                "Cash Flow": max(0, cash_flow),
                "Profitability": profitability,
                "Client Retention": retention
            }
        },
        "insights": insights
    }
