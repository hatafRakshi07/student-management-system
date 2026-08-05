"""Tests for assignments endpoints."""


def test_list_assignments(client, admin_token):
    res = client.get("/api/assignments", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, (list, dict))


def test_create_assignment_requires_auth(client):
    res = client.post("/api/assignments", json={
        "title": "Math Homework 1",
        "description": "Solve exercises 1-10",
        "deadline": "2026-08-10T23:59:59",
        "subject_id": 1,
        "max_marks": 100
    })
    assert res.status_code in (401, 403)

