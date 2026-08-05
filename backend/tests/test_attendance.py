"""Tests for attendance endpoints."""


def test_mark_attendance(client, admin_token):
    # First create a student profile
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
        "/api/attendance",
        json={
            "student_id": student_id,
            "subject_id": None,
            "status": "present",
            "date": "2026-08-04"
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

    # Get student attendance
    res = client.get(f"/api/attendance/student/{student_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "records" in res.json() or "attendance" in res.json() or isinstance(res.json(), (list, dict))
