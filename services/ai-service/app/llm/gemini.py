import logging

from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    """Google Gemini API provider (stub for future implementation)."""

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        raise NotImplementedError(
            "Gemini provider not yet implemented. "
            "Set AI_PROVIDER=groq and configure GROQ_API_KEY instead."
        )

    async def health_check(self) -> bool:
        return bool(settings.GEMINI_API_KEY)
