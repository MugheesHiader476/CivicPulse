"""App-wide triage provider selection shared by all backend replicas through Redis."""

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
        self.default = {"llm": "groq", "ollama": "ollama"}.get(settings.triage_provider, "rules")

    def selected(self) -> str:
        value = self.cache.get_triage_provider()
        return value if value in {"groq", "ollama"} else self.default

    def current(self) -> TriageProvider:
        return {"groq": self.groq, "ollama": self.ollama, "rules": self.rules}[self.selected()]

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
