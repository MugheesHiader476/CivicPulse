from app.providers.triage.base import RetryableTriageError
from app.repositories.seed import seed


def test_seed_is_idempotent_and_spans_categories(api):
    client, app, _ = api
    sessions = app.state.service.repository.sessions
    assert seed(sessions) == 30
    assert seed(sessions) == 0
    assert client.get("/api/complaints").json()["total"] == 30
    stats = client.get("/api/stats").json()
    assert set(stats["by_category"]) == {"water", "electricity", "sanitation", "roads", "streetlights", "other"}


def test_retryable_provider_error_retries_once(api, payload, citizen_post):
    _, app, _ = api
    class Flaky:
        name = "llm:groq"
        calls = 0
        def triage(self, text, location):
            self.calls += 1
            if self.calls == 1:
                raise RetryableTriageError("temporary")
            return app.state.service.rules.triage(text, location)
    provider = Flaky()
    app.state.service.provider = provider
    response = citizen_post(payload)
    assert response.status_code == 201 and response.json()["triaged_by"] == "llm:groq"
    assert provider.calls == 2


def test_fatal_provider_error_is_not_retried(api, payload, citizen_post):
    _, app, _ = api
    class Fatal:
        name = "llm:groq"
        calls = 0
        def triage(self, text, location):
            self.calls += 1
            raise ValueError("bad request")
    provider = Fatal()
    app.state.service.provider = provider
    assert citizen_post(payload).json()["triaged_by"] == "rules:fallback"
    assert provider.calls == 1


def test_duplicate_triage_uses_content_hash_cache(api, payload, citizen_post):
    client, app, _ = api
    class Counting:
        name = "llm:groq"
        calls = 0
        def triage(self, text, location):
            self.calls += 1
            return app.state.service.rules.triage(text, location)
    provider = Counting()
    app.state.service.provider = provider
    assert citizen_post(payload).status_code == 201
    assert citizen_post(payload).status_code == 201
    assert provider.calls == 1
    assert client.get("/api/complaints").json()["total"] == 2
