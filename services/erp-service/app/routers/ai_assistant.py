from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.oauth2 import get_current_user
from app.database import cursor

router = APIRouter(
    prefix="/ai",
    tags=["AI Assistant"]
)


class ChatRequest(BaseModel):
    question: str


@router.get("/insights")
def get_insights(
    current_user: int = Depends(get_current_user)
):

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM invoices
        WHERE owner_id=%s
        AND status='pending'
        """,
        (current_user,)
    )

    pending = cursor.fetchone()["count"]

    cursor.execute(
        """
        SELECT COALESCE(SUM(amount),0) AS revenue
        FROM invoices
        WHERE owner_id=%s
        AND status='paid'
        """,
        (current_user,)
    )

    revenue = cursor.fetchone()["revenue"]

    insights = []

    if pending > 5:
        insights.append(
            "You have many pending invoices. Consider sending reminders."
        )

    if revenue > 100000:
        insights.append(
            "Revenue is performing well this month."
        )

    if len(insights) == 0:
        insights.append(
            "Business metrics look healthy."
        )

    return {
        "insights": insights
    }


@router.post("/chat")
def chat(
    request: ChatRequest,
    current_user: int = Depends(get_current_user)
):

    question = request.question.lower()

    if "revenue" in question:

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount),0) AS revenue
            FROM invoices
            WHERE owner_id=%s
            AND status='paid'
            """,
            (current_user,)
        )

        revenue = cursor.fetchone()["revenue"]

        return {
            "answer": f"Your total revenue is ₹{revenue}"
        }

    elif "pending invoice" in question:

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM invoices
            WHERE owner_id=%s
            AND status='pending'
            """,
            (current_user,)
        )

        total = cursor.fetchone()["total"]

        return {
            "answer": f"You have {total} pending invoices."
        }

    elif "client" in question:

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM clients
            WHERE owner_id=%s
            """,
            (current_user,)
        )

        total = cursor.fetchone()["total"]

        return {
            "answer": f"You currently have {total} clients."
        }

    elif "expense" in question:

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount),0) AS total
            FROM expenses
            WHERE owner_id=%s
            """,
            (current_user,)
        )

        total = cursor.fetchone()["total"]

        return {
            "answer": f"Your total expenses are ₹{total}"
        }

    else:
        return {
            "answer": (
                "I can currently answer questions about "
                "revenue, expenses, clients, and pending invoices."
            )
        }