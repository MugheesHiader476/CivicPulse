def test_citizen_cannot_read_contacts_or_change_status(api, token_factory, payload):
    client, _, _ = api
    complaint_id = client.post("/api/complaints", json={**payload, "reporter_contact": "03001234567"}).json()["id"]
    assert client.get("/api/me").json() == {"role": "operator"}

    client.headers["Authorization"] = f"Bearer {token_factory(user_id='citizen_test')}"
    assert client.get("/api/me").json() == {"role": "citizen"}
    assert client.post("/api/complaints", json=payload).status_code == 201
    assert client.get("/api/stats").status_code == 200
    for path in ("/api/complaints", f"/api/complaints/{complaint_id}", "/api/meta/providers"):
        response = client.get(path)
        assert response.status_code == 403
        assert "03001234567" not in response.text
    assert client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"}).status_code == 403

    client.headers["Authorization"] = f"Bearer {token_factory()}"
    assert client.get(f"/api/complaints/{complaint_id}").json()["status"] == "open"
