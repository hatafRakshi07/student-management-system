"""Tests for exams endpoints."""


def test_list_exams(client, admin_token):
    res = client.get("/api/exams", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), (list, dict))


def test_create_exam(client, admin_token):
    res = client.post(
        "/api/exams",
        json={
            "title": "Midterm Examination",
            "exam_type": "midterm",
            "exam_date": "2026-09-01T10:00:00",
            "total_marks": 100
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in (200, 201)

