import pytest


def test_analytics_endpoints(client, admin_auth_headers, teacher_auth_headers, student_auth_headers):
    # Admin dashboard summary stats
    resp_admin = client.get("/api/analytics/dashboard", headers=admin_auth_headers)
    assert resp_admin.status_code == 200

    # Attendance trend for teachers/admin
    resp_trend = client.get("/api/analytics/attendance-trend", headers=teacher_auth_headers)
    assert resp_trend.status_code == 200

    # Subject performance
    resp_subject = client.get("/api/analytics/subject-performance", headers=teacher_auth_headers)
    assert resp_subject.status_code == 200
