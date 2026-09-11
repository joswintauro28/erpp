import logging
from collections.abc import AsyncIterator

from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.groq import GroqProvider
from app.llm.gemini import GeminiProvider

logger = logging.getLogger(__name__)


class FallbackLLMProvider(LLMProvider):
    """Resilient provider that attempts the primary LLM provider and automatically
    falls back to secondary providers on auth errors, rate limits, or unavailability.
    """

    def __init__(self):
        self.providers: list[tuple[str, LLMProvider]] = []
        primary = settings.AI_PROVIDER.lower()
        if primary == "gemini":
            self.providers.append(("gemini", GeminiProvider()))
            self.providers.append(("groq", GroqProvider()))
        else:
            self.providers.append(("groq", GroqProvider()))
            self.providers.append(("gemini", GeminiProvider()))

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        last_error = None
        for name, provider in self.providers:
            try:
                return await provider.chat(messages, model=model)
            except Exception as e:
                logger.warning(
                    "LLM provider %s failed during chat: %s. Attempting fallback...",
                    name,
                    str(e),
                )
                last_error = e

        if last_error:
            raise last_error
        raise RuntimeError("No LLM provider available")

    async def chat_stream(
        self, messages: list[dict], model: str | None = None
    ) -> AsyncIterator[str]:
        last_error = None
        for name, provider in self.providers:
            try:
                stream = provider.chat_stream(messages, model=model)
                first_chunk = True
                async for chunk in stream:
                    if first_chunk:
                        first_chunk = False
                    yield chunk
                return
            except Exception as e:
                logger.warning(
                    "LLM provider %s failed during chat_stream: %s. Attempting fallback...",
                    name,
                    str(e),
                )
                last_error = e

        if last_error:
            raise last_error
        raise RuntimeError("No LLM provider available for streaming")

    async def health_check(self) -> bool:
        for _, provider in self.providers:
            if await provider.health_check():
                return True
        return False


def get_provider() -> LLMProvider:
    """Factory to get the resilient LLM provider with auto-fallback."""
    return FallbackLLMProvider()

