"""Tests for exams endpoints."""

def test_list_exams(client, admin_token):
    res = client.get("/api/exams/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), (list, dict))


def test_create_exam(client, admin_token):
    res = client.post(
        "/api/exams/schedule",
        json={
            "title": "Midterm Examination",
            "exam_type": "MID_TERM",
            "class_name": "CS-3A",
            "department": "CS",
            "semester": 3,
            "exam_date": "2026-09-01"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in (200, 201)
