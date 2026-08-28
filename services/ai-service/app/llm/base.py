from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract LLM provider interface."""

    @abstractmethod
    async def chat(self, messages: list[dict], model: str | None = None) -> str:
        """Send messages to LLM and return the assistant response text."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is configured and reachable."""
        ...
