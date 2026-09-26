

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
