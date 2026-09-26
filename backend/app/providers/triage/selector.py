"""App-wide triage provider selection shared by all backend replicas through Redis."""

from typing import Literal

from app.config import Settings
from app.providers.cache import RedisCache
from app.providers.triage.base import TriageProvider
from app.providers.triage.llm import LLMProvider, OllamaProvider
from app.providers.triage.rules import RuleBasedTriage
from app.schemas import ProviderOption, ProviderSelection


class ProviderUnavailable(Exception):
    pass


class ProviderSelector:
    def __init__(self, settings: Settings, cache: RedisCache):
        self.cache = cache
        self.groq = LLMProvider(settings.groq_api_key, settings.groq_model)
        self.ollama = OllamaProvider(settings.ollama_url, settings.ollama_model)
        self.rules = RuleBasedTriage()
        self.default: Literal["groq", "ollama", "rules"] = (
            "groq" if settings.triage_provider == "llm" else
            "ollama" if settings.triage_provider == "ollama" else "rules"
        )

    def selected(self) -> Literal["groq", "ollama", "rules"]:
        value = self.cache.get_triage_provider()
        if value == "groq":
            return "groq"
        if value == "ollama":
            return "ollama"
        return self.default

    def current(self) -> TriageProvider:
        selected = self.selected()
        if selected == "groq":
            return self.groq
        if selected == "ollama":
            return self.ollama
        return self.rules


    def options(self) -> list[ProviderOption]:
        groq_ready = bool(self.groq.key)
        ollama_ready = self.ollama.is_available()
        return [
            ProviderOption(
                id="groq", label="Groq cloud", model=self.groq.model, location="hosted",
                available=groq_ready,
                reason=None if groq_ready else "Set GROQ_API_KEY on the backend.",
            ),
            ProviderOption(
                id="ollama", label="Local Ollama", model=self.ollama.model, location="local",
                available=ollama_ready,
                reason=None if ollama_ready else "Start the local-ai profile and pull the model.",
            ),
        ]

    def choose(self, selection: ProviderSelection) -> None:
        option = next(item for item in self.options() if item.id == selection.provider)
        if not option.available:
            raise ProviderUnavailable(option.reason or "Provider is unavailable")
        self.cache.set_triage_provider(selection.provider)
