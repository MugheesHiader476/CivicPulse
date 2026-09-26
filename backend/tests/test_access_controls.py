def test_citizen_cannot_read_contacts_or_change_status(api, token_factory, payload, citizen_post):
    client, _, _ = api
    complaint_id = citizen_post({**payload, "reporter_contact": "03001234567"}, user_id="citizen_owner").json()["id"]
    assert client.get("/api/me").json() == {"role": "operator"}

    client.headers["Authorization"] = f"Bearer {token_factory(user_id='citizen_test')}"
    assert client.get("/api/me").json() == {"role": "citizen"}
    assert client.post("/api/complaints", json=payload).status_code == 201
    for path in ("/api/complaints", f"/api/complaints/{complaint_id}", "/api/meta/providers", "/api/stats"):
        response = client.get(path)
        assert response.status_code == 403
        assert "03001234567" not in response.text
    assert client.patch(f"/api/complaints/{complaint_id}/status", json={"status": "in_progress"}).status_code == 403

    client.headers["Authorization"] = f"Bearer {token_factory()}"
    assert client.get(f"/api/complaints/{complaint_id}").json()["status"] == "open"
    assert client.get("/api/stats").status_code == 200


def test_citizen_can_read_only_own_reports(api, token_factory, payload, citizen_post):
    client, _, _ = api
    another_report = citizen_post(payload, user_id="citizen_other").json()
    client.headers["Authorization"] = f"Bearer {token_factory(user_id='citizen_one')}"
    own_report = client.post("/api/complaints", json={**payload, "location": "Citizen One Street"}).json()
    mine = client.get("/api/my/complaints")
    assert mine.status_code == 200
    assert [item["id"] for item in mine.json()["items"]] == [own_report["id"]]
    assert client.get(f"/api/my/complaints/{own_report['id']}").status_code == 200
    assert client.get(f"/api/my/complaints/{another_report['id']}").status_code == 404


def test_admin_cannot_submit_or_access_personal_report_routes(api, payload):
    client, _, _ = api
    assert client.post("/api/complaints", json=payload).status_code == 403
    assert client.get("/api/my/complaints").status_code == 403
    assert client.get("/api/my/complaints/00000000-0000-0000-0000-000000000001").status_code == 403
