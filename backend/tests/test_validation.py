from types import SimpleNamespace

import pytest

from app.config import Settings
from app.security import client_ip


def test_invalid_rate_limit_and_proxy_network_fail_at_startup(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    monkeypatch.setenv("REDIS_URL", "redis://")
    monkeypatch.setenv("CLERK_SECRET_KEY", "sk_test_local_fake")
    monkeypatch.setenv("CLERK_AUTHORIZED_PARTIES", "http://testserver")

    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "0")
    with pytest.raises(ValueError, match="RATE_LIMIT_PER_MINUTE"):
        Settings.from_env()

    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "six")
    with pytest.raises(ValueError, match="RATE_LIMIT_PER_MINUTE"):
        Settings.from_env()

    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "6")
    monkeypatch.setenv("TRUSTED_PROXY_CIDRS", "not-a-network")
    with pytest.raises(ValueError, match="TRUSTED_PROXY_CIDRS"):
        Settings.from_env()


def test_malformed_programmatic_proxy_setting_fails_closed():
    request = SimpleNamespace(
        client=SimpleNamespace(host="172.28.10.2"),
        headers={"X-Real-IP": "203.0.113.15"},
        app=SimpleNamespace(
            state=SimpleNamespace(
                settings=SimpleNamespace(trusted_proxy_cidrs="not-a-network")
            )
        ),
    )

    assert client_ip(request) == "172.28.10.2"



def test_multiline_location_is_rejected_with_field_error(api, payload, citizen_post):
    response = citizen_post({**payload, "location": "Street 12\nLahore"})
    assert response.status_code == 400
    assert response.json()["errors"][0]["field"] == "location"


def test_multiline_provider_summary_falls_back_to_safe_rules(api, payload, citizen_post):
    _, app, _ = api

    class BadSummary:
        name = "llm:groq"

        def triage(self, text, location):
            return {"category": "water", "priority": "high", "summary": "first\nsecond", "confidence": 1}

    app.state.service.provider = BadSummary()
    response = citizen_post(payload)
    assert response.status_code == 201
    assert response.json()["triaged_by"] == "rules:fallback"
    assert "\n" not in response.json()["ai_summary"]
