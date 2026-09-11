import logging
from collections.abc import AsyncIterator

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

    def _build_contents(self, messages: list[dict]):
        from google.genai import types as genai_types

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
        return contents, system_instruction

    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        from google.genai import types as genai_types

        self._ensure_client()
        candidate_models = [model] if model else ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"]
        contents, system_instruction = self._build_contents(messages)

        if not contents:
            raise ValueError("No user messages to send to Gemini")

        config = genai_types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
        )
        if system_instruction:
            config.system_instruction = system_instruction

        last_err = None
        for m in candidate_models:
            try:
                response = await self._client.aio.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                return response.text or ""
            except Exception as e:
                logger.warning("Gemini model %s failed: %s", m, e)
                last_err = e

        if last_err:
            raise last_err
        raise RuntimeError("No Gemini model succeeded")

    async def chat_stream(self, messages: list[dict], model: str | None = None) -> AsyncIterator[str]:
        from google.genai import types as genai_types

        self._ensure_client()
        candidate_models = [model] if model else ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"]
        contents, system_instruction = self._build_contents(messages)

        if not contents:
            raise ValueError("No user messages to send to Gemini")

        config = genai_types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=2048,
        )
        if system_instruction:
            config.system_instruction = system_instruction

        last_err = None
        for m in candidate_models:
            try:
                async for chunk in await self._client.aio.models.generate_content_stream(
                    model=m,
                    contents=contents,
                    config=config,
                ):
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.warning("Gemini stream with model %s failed: %s", m, e)
                last_err = e

        if last_err:
            raise last_err
        raise RuntimeError("No Gemini model succeeded for streaming")

    async def health_check(self) -> bool:
        if not settings.GEMINI_API_KEY:
            return False
        try:
            self._ensure_client()
            await self._client.aio.models.list()
            return True
        except Exception:
            return False
