"""Exercise real signature, expiry, origin, and header checks without Clerk network calls."""


def test_signed_clerk_session_can_use_all_app_routes(api, payload):
    client, _, _ = api
    created = client.post("/api/complaints", json=payload)
    assert created.status_code == 201
    complaint_id = created.json()["id"]
    assert client.get("/api/stats").status_code == 200
    assert client.get("/api/complaints").status_code == 200
    assert client.get(f"/api/complaints/{complaint_id}").status_code == 200
    assert client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"}).status_code == 200
    assert client.get("/api/meta/providers").status_code == 200


def test_bearer_header_is_required_even_with_a_session_cookie(api, token_factory):
    client, _, _ = api
    client.headers.pop("Authorization")
    client.cookies.set("__session", token_factory())
    response = client.get("/api/stats")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_expired_session_is_rejected(api, token_factory):
    client, _, _ = api
    client.headers["Authorization"] = f"Bearer {token_factory(expires_in=-60)}"
    assert client.get("/api/stats").status_code == 401


def test_session_from_untrusted_origin_is_rejected(api, token_factory):
    client, _, _ = api
    client.headers["Authorization"] = f"Bearer {token_factory(azp='https://attacker.example')}"
    assert client.get("/api/stats").status_code == 401


def test_pending_session_cannot_use_api(api, token_factory):
    client, _, _ = api
    client.headers["Authorization"] = f"Bearer {token_factory(status='pending')}"
    assert client.get("/api/stats").status_code == 401
