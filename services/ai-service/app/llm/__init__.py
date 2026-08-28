from abc import ABC, abstractmethod
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        """Send messages to LLM and return the assistant response text."""
        ...


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


class GeminiProvider(LLMProvider):
    """Google Gemini API provider (stub for future)."""

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        raise NotImplementedError("Gemini provider not yet implemented")


def get_provider() -> LLMProvider:
    """Factory to get the configured LLM provider."""
    providers = {
        "groq": GroqProvider,
        "gemini": GeminiProvider,
    }
    provider_class = providers.get(settings.AI_PROVIDER)
    if not provider_class:
        raise ValueError(f"Unknown AI_PROVIDER: {settings.AI_PROVIDER}")
    return provider_class()
