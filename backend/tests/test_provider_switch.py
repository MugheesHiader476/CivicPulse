"""Operator switching, provider isolation, and local-model readiness."""

from dataclasses import replace

import httpx

from app.providers.triage.llm import OllamaProvider
from app.providers.triage.selector import ProviderSelector


def install_selector(api, monkeypatch, *, groq_key="test-groq", local_ready=True):
    client, app, cache = api
    settings = replace(app.state.settings, groq_api_key=groq_key)
    selector = ProviderSelector(settings, cache)
    monkeypatch.setattr(selector.ollama, "is_available", lambda: local_ready)
    app.state.service.selector = selector
    return client, app, cache, selector


def test_operator_switches_providers_and_cache_is_separate(api, payload, monkeypatch):
    client, app, cache, selector = install_selector(api, monkeypatch)
    calls = {"groq": 0, "ollama": 0}

    def triage_as(name):
        def run(text, location):
            calls[name] += 1
            return app.state.service.rules.triage(text, location)
        return run

    monkeypatch.setattr(selector.groq, "triage", triage_as("groq"))
    monkeypatch.setattr(selector.ollama, "triage", triage_as("ollama"))

    selected = client.put("/api/meta/providers", json={"provider": "groq"})
    assert selected.status_code == 200
    assert selected.json()["selected_provider"] == "groq"
    first = client.post("/api/complaints", json=payload)
    assert first.status_code == 201
    assert first.json()["triaged_by"] == "llm:groq"

    selected = client.put("/api/meta/providers", json={"provider": "ollama"})
    assert selected.status_code == 200
    assert selected.json()["selected_provider"] == "ollama"
    second = client.post("/api/complaints", json=payload)
    assert second.status_code == 201
    assert second.json()["triaged_by"] == "llm:ollama"
    assert cache.provider_choice == "ollama"
    assert calls == {"groq": 1, "ollama": 1}


def test_unavailable_options_cannot_be_selected(api, monkeypatch):
    client, _, cache, _ = install_selector(api, monkeypatch, groq_key="", local_ready=False)
    meta = client.get("/api/meta/providers").json()
    assert {option["id"]: option["available"] for option in meta["options"]} == {
        "groq": False, "ollama": False,
    }
    assert client.put("/api/meta/providers", json={"provider": "ollama"}).status_code == 409
    assert client.put("/api/meta/providers", json={"provider": "groq"}).status_code == 409
    assert cache.provider_choice is None


def test_citizen_cannot_switch_provider(api, token_factory, monkeypatch):
    client, _, cache, _ = install_selector(api, monkeypatch)
    client.headers["Authorization"] = f"Bearer {token_factory(user_id='citizen')}"
    assert client.put("/api/meta/providers", json={"provider": "groq"}).status_code == 403
    assert cache.provider_choice is None


def test_ollama_requires_the_exact_pulled_model(monkeypatch):
    provider = OllamaProvider("http://ollama:11434", "llama3.2:1b-instruct-q4_K_M")
    request = httpx.Request("GET", "http://ollama:11434/api/tags")

    def fake_get(url, timeout):
        assert url == str(request.url) and timeout == 2.0
        return httpx.Response(200, request=request, json={"models": [{"name": "another:latest"}]})

    monkeypatch.setattr(httpx, "get", fake_get)
    assert provider.is_available() is False
    monkeypatch.setattr(
        httpx, "get",
        lambda url, timeout: httpx.Response(200, request=request, json={"models": [{"name": provider.model}]}),
    )
    assert provider.is_available() is True


def test_ollama_request_is_local_structured_and_has_no_key(monkeypatch):
    provider = OllamaProvider("http://ollama:11434", "llama3.2:1b-instruct-q4_K_M")
    seen = {}
    request = httpx.Request("POST", "http://ollama:11434/api/chat")

    def fake_post(url, **kwargs):
        seen.update(url=url, **kwargs)
        return httpx.Response(
            200, request=request,
            json={"message": {"content": '{"category":"water","priority":"high","summary":"Burst pipe","confidence":0.8}'}},
        )

    monkeypatch.setattr(httpx, "post", fake_post)
    result = provider.triage("Burst water pipe at the market", "Central Market")
    assert result.category.value == "water"
    assert seen["url"] == str(request.url)
    assert seen["timeout"] == 10.0
    assert seen["json"]["model"] == provider.model
    assert seen["json"]["format"]["type"] == "object"
    assert "Authorization" not in seen


def test_redis_provider_choice_handles_bytes():
    from app.providers.cache import RedisCache

    class FakeRedis:
        value = None

        def get(self, key):
            assert key == "triage:active_provider"
            return self.value

        def set(self, key, value):
            assert key == "triage:active_provider"
            self.value = value.encode()

    cache = RedisCache(FakeRedis())
    assert cache.get_triage_provider() is None
    cache.set_triage_provider("ollama")
    assert cache.get_triage_provider() == "ollama"
