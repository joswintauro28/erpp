import logging

import httpx

from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GroqProvider(LLMProvider):
    """Groq REST API provider (default)."""

    BASE_URL = "https://api.groq.com/openai/v1"

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        model = model or settings.GROQ_MODEL
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2048,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def health_check(self) -> bool:
        if not settings.GROQ_API_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/models",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                )
                return response.status_code == 200
        except Exception:
            return False
