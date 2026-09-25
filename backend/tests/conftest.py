import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_local_fake")
os.environ.setdefault("CLERK_AUTHORIZED_PARTIES", "http://testserver")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("REDIS_URL", "redis://")

from app.config import Settings
from app.main import create_app
from app.providers.triage.simulated import SimulatedTriage
from app.repositories.complaints import ComplaintRepository
from app.repositories.models import Base


class TestCache:
    def __init__(self):
        self.stats = {}
        self.version = 0
        self.triage = {}
        self.calls = {}
        self.up = True
        self.provider_choice = None

    def check_rate(self, ip, limit):
        self.calls[ip] = self.calls.get(ip, 0) + 1
        return 30 if self.calls[ip] > limit else 0

    def get_stats(self):
        return self.stats.get(self.version), self.version

    def set_stats(self, value, version):
        self.stats[version] = value

    def invalidate_stats(self):
        self.version += 1

    def get_triage(self, key):
        return self.triage.get(key)

    def set_triage(self, key, result, provider):
        self.triage[key] = result, provider

    def get_triage_provider(self):
        return self.provider_choice

    def set_triage_provider(self, provider):
        self.provider_choice = provider

    def ping(self):
        if not self.up:
            raise ConnectionError

    def close(self):
        pass


TEST_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
TEST_JWT_KEY = TEST_PRIVATE_KEY.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()


@pytest.fixture
def token_factory():
    def make_token(*, azp="http://testserver", expires_in=60, status=None, user_id="user_test"):
        now = int(datetime.now(timezone.utc).timestamp())
        claims = {"iss": "https://test.clerk.accounts.dev", "sub": user_id, "sid": "sess_test",
                  "azp": azp, "iat": now, "nbf": now, "exp": now + expires_in}
        if status is not None:
            claims["sts"] = status
        return jwt.encode(claims, TEST_PRIVATE_KEY, algorithm="RS256")
    return make_token


@pytest.fixture
def api(token_factory):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    repository = ComplaintRepository(sessionmaker(engine, expire_on_commit=False))
    cache = TestCache()
    settings = Settings(database_url="sqlite://", redis_url="redis://", clerk_secret_key="sk_test_local_fake", clerk_jwt_key=TEST_JWT_KEY, clerk_authorized_parties=("http://testserver",), clerk_operator_user_ids=("user_test",), triage_provider="simulated", rate_limit=6)
    app = create_app(settings, repository, cache, SimulatedTriage())
    with TestClient(app) as client:
        client.headers["Authorization"] = f"Bearer {token_factory()}"
        yield client, app, cache
    engine.dispose()


@pytest.fixture
def payload():
    return {"text": "Burst water pipe flooding Street 12 since fajr", "location": "Street 12, Lahore"}
