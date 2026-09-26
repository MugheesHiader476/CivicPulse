def test_triage_cache_is_scoped_to_provider_and_model(api, payload, citizen_post):
    _, app, _ = api

    class Counting:
        name = "llm:groq"

        def __init__(self, model):
            self.model = model
            self.calls = 0

        def triage(self, text, location):
            self.calls += 1
            return app.state.service.rules.triage(text, location)

    first = Counting("model-a")
    second = Counting("model-b")
    for provider in (first, second, first):
        app.state.service.provider = provider
        assert citizen_post(payload).status_code == 201
    assert first.calls == 1
    assert second.calls == 1
