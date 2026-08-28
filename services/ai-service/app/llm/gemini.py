import logging

from app.core.config import settings
from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    """Google Gemini API provider using the new google-genai SDK."""

    def __init__(self):
        self._client = None

    def _ensure_client(self):
        if self._client is None:
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured")
            from google import genai
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        from google.genai import types as genai_types

        self._ensure_client()
        model = model or "gemini-2.5-flash"

        # Build contents from messages (skip system, handle user/assistant)
        contents = []
        system_instruction = None
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            elif msg["role"] == "user":
                contents.append(genai_types.Content(
                    role="user",
                    parts=[genai_types.Part.from_text(text=msg["content"])],
                ))
            elif msg["role"] == "assistant":
                contents.append(genai_types.Content(
                    role="model",
                    parts=[genai_types.Part.from_text(text=msg["content"])],
                ))

        if not contents:
            raise ValueError("No user messages to send to Gemini")

        config = genai_types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
        )
        if system_instruction:
            config.system_instruction = system_instruction

        response = await self._client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
        return response.text

    async def health_check(self) -> bool:
        if not settings.GEMINI_API_KEY:
            return False
        try:
            self._ensure_client()
            # Simple test: list models
            await self._client.aio.models.list()
            return True
        except Exception:
            return False
