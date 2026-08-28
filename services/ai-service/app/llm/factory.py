from app.core.config import settings
from app.llm.base import LLMProvider
from app.llm.groq import GroqProvider
from app.llm.gemini import GeminiProvider


_PROVIDERS = {
    "groq": GroqProvider,
    "gemini": GeminiProvider,
}


def get_provider() -> LLMProvider:
    """Factory to get the configured LLM provider."""
    provider_class = _PROVIDERS.get(settings.AI_PROVIDER)
    if not provider_class:
        raise ValueError(
            f"Unknown AI_PROVIDER: {settings.AI_PROVIDER}. "
            f"Supported: {', '.join(_PROVIDERS.keys())}"
        )
    return provider_class()
