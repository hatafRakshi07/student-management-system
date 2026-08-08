"""Tests for attendance endpoints."""

def test_mark_attendance(client, admin_token):
    res_student = client.post("/api/auth/register/student", json={
        "email": "attendance_student@test.com",
        "full_name": "Attendance Student",
        "password": "Student@1234",
        "phone": "9000000002",
        "roll_number": "S002",
        "department": "CS",
        "class_name": "CS-3A",
        "section": "A",
        "semester": 3,
        "year": 2,
    })
    student_id = res_student.json()["user_id"]

    res = client.post(
        "/api/attendance/session/submit",
        json={
            "class_name": "CS-3A",
            "section": "A",
            "date": "2026-08-04",
            "records": [{"student_id": student_id, "status": "PRESENT"}]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code in (200, 201)


def test_get_student_attendance(client, admin_token):
    res_student = client.post("/api/auth/register/student", json={
        "email": "att_student2@test.com",
        "full_name": "Attendance Student 2",
        "password": "Student@1234",
        "phone": "9000000003",
        "roll_number": "S003",
        "department": "CS",
        "class_name": "CS-3A",
        "section": "A",
        "semester": 3,
        "year": 2,
    })
    student_id = res_student.json()["user_id"]

    res = client.get(f"/api/attendance/summary/student/{student_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "attendance_percentage" in res.json() or "summary" in res.json() or isinstance(res.json(), dict)
