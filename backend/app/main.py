import json
import logging
import re
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from redis import Redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import Settings
from app.providers.cache import RedisCache
from app.providers.triage.llm import LLMProvider, OllamaProvider
from app.providers.triage.rules import RuleBasedTriage
from app.providers.triage.selector import ProviderSelector
from app.providers.triage.simulated import SimulatedTriage
from app.repositories.complaints import ComplaintRepository
from app.routes.api import router
from app.schemas import Health, Readiness
from app.services.complaints import ComplaintService

REQUESTS = Counter("civicpulse_http_requests_total", "HTTP request count", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("civicpulse_http_request_duration_seconds", "HTTP request latency", ["method", "path"])
REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        fields = {"level": record.levelname, "message": record.getMessage(),
                  "request_id": getattr(record, "request_id", "system")}
        for key in ("complaint_id", "provider", "error_class", "method", "path", "status"):
            value = getattr(record, key, None)
            if value is not None:
                fields[key] = value
        return json.dumps(fields)


def configure_logging() -> None:
    logger = logging.getLogger("civicpulse")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
    logger.propagate = False


def select_provider(settings: Settings):
    if settings.triage_provider == "simulated":
        return SimulatedTriage(settings.simulated_failure)
    if settings.triage_provider == "llm":
        return LLMProvider(settings.groq_api_key, settings.groq_model)
    if settings.triage_provider == "ollama":
        return OllamaProvider(settings.ollama_url, settings.ollama_model)
    return RuleBasedTriage()


def create_app(settings: Settings | None = None, repository: ComplaintRepository | None = None,
               cache: RedisCache | None = None, provider=None) -> FastAPI:
    settings = settings or Settings.from_env()
    configure_logging()
    engine = None
    if repository is None:
        engine = create_engine(settings.database_url, pool_pre_ping=True)
        repository = ComplaintRepository(sessionmaker(engine, expire_on_commit=False))
    if cache is None:
        cache = RedisCache(Redis.from_url(settings.redis_url, socket_timeout=2, socket_connect_timeout=2))
    selector = ProviderSelector(settings, cache) if provider is None and settings.triage_provider != "simulated" else None
    service = ComplaintService(repository, cache, provider or select_provider(settings), settings.rate_limit, selector)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        cache.close()
        if engine is not None:
            engine.dispose()

    app = FastAPI(title="CivicPulse API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.service = service
    app.include_router(router)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        supplied = request.headers.get("X-Request-ID", "")
        request_id = supplied if REQUEST_ID.fullmatch(supplied) else str(uuid4())
        request.state.request_id = request_id
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:  # noqa: BLE001 - return a generic error at the HTTP boundary
            logging.getLogger("civicpulse").error("request_failed", extra={"request_id": request_id})
            response = JSONResponse(status_code=503, content={"detail": "Service temporarily unavailable"})
        response.headers["X-Request-ID"] = request_id
        path = request.scope.get("route")
        route = path.path if path else "unmatched"
        REQUESTS.labels(request.method, route, str(response.status_code)).inc()
        REQUEST_LATENCY.labels(request.method, route).observe(time.monotonic() - started)
        logging.getLogger("civicpulse").info("http_request", extra={"request_id": request_id, "method": request.method,
                                                               "path": route, "status": response.status_code})
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        errors = []
        for error in exc.errors():
            location = error.get("loc", ())
            field = str(location[-1]) if location else "request"
            errors.append({"field": field, "message": str(error.get("msg", "Invalid value"))})
        return JSONResponse(status_code=400, content={"detail": "Validation failed", "errors": errors})

    @app.get("/health", response_model=Health)
    def health():
        return {"status": "ok"}

    @app.get("/ready", response_model=Readiness, responses={503: {"model": Readiness}})
    def ready():
        checks = {}
        for name, probe in (("postgres", repository.ping), ("redis", cache.ping)):
            try:
                probe()
                checks[name] = "ok"
            except Exception:  # noqa: BLE001 - report an unavailable dependency
                checks[name] = "unavailable"
        return JSONResponse(status_code=200 if all(v == "ok" for v in checks.values()) else 503,
                            content={"status": "ready" if all(v == "ok" for v in checks.values()) else "not_ready", "checks": checks})

    @app.get("/metrics", response_class=PlainTextResponse)
    def metrics():
        return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app


app = create_app()
