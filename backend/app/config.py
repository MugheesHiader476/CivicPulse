import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    redis_url: str
    clerk_secret_key: str
    clerk_jwt_key: str = ""
    clerk_authorized_parties: tuple[str, ...] = ("http://127.0.0.1:8080",)
    clerk_operator_user_ids: tuple[str, ...] = ()
    triage_provider: str = "rules"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:1b-instruct-q4_K_M"
    simulated_failure: str = ""
    rate_limit: int = 6
    trusted_proxy_cidrs: str = ""

    @classmethod
    def from_env(cls) -> "Settings":
        clerk_secret_key = os.getenv("CLERK_SECRET_KEY", "")
        if not clerk_secret_key:
            raise ValueError("CLERK_SECRET_KEY is required")
        parties = tuple(part.strip() for part in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if part.strip())
        if not parties or any(not part.startswith(("http://", "https://")) for part in parties):
            raise ValueError("CLERK_AUTHORIZED_PARTIES must contain trusted http(s) origins")
        provider = os.getenv("TRIAGE_PROVIDER", "rules")
        if provider not in {"rules", "simulated", "llm", "ollama"}:
            raise ValueError("TRIAGE_PROVIDER must be rules, simulated, llm, or ollama")
        if provider == "llm" and not os.getenv("GROQ_API_KEY"):
            raise ValueError("GROQ_API_KEY is required with TRIAGE_PROVIDER=llm")
        return cls(
            database_url=os.environ["DATABASE_URL"],
            redis_url=os.environ["REDIS_URL"],
            clerk_secret_key=clerk_secret_key,
            clerk_jwt_key=os.getenv("CLERK_JWT_KEY", ""),
            clerk_authorized_parties=parties,
            clerk_operator_user_ids=tuple(
                user_id.strip() for user_id in os.getenv("CLERK_OPERATOR_USER_IDS", "").split(",")
                if user_id.strip()
            ),
            triage_provider=provider,
            groq_api_key=os.getenv("GROQ_API_KEY", ""),
            groq_model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
            ollama_url=os.getenv("OLLAMA_URL", "http://ollama:11434"),
            ollama_model=os.getenv("OLLAMA_MODEL", "llama3.2:1b-instruct-q4_K_M"),
            simulated_failure=os.getenv("SIMULATED_FAILURE", ""),
            rate_limit=int(os.getenv("RATE_LIMIT_PER_MINUTE", "6")),
            trusted_proxy_cidrs=os.getenv("TRUSTED_PROXY_CIDRS", ""),
        )
