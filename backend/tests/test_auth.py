"""Tests for authentication endpoints."""

STUDENT_PAYLOAD = {
    "email": "student@test.com",
    "full_name": "Test Student",
    "password": "Student@1234",
    "phone": "9000000001",
    "roll_number": "S001",
    "department": "CS",
    "class_name": "CS-3A",
    "section": "A",
    "semester": 3,
    "year": 2,
}


def test_register_student(client):
    res = client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    assert res.status_code == 201
    assert "user_id" in res.json()


def test_register_student_duplicate_email(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    res = client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    assert res.status_code == 400


def test_login_success(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    res = client.post("/api/auth/login", json={
        "email": STUDENT_PAYLOAD["email"],
        "password": STUDENT_PAYLOAD["password"],
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "student"


def test_login_wrong_password(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    res = client.post("/api/auth/login", json={
        "email": STUDENT_PAYLOAD["email"],
        "password": "WrongPassword",
    })
    assert res.status_code == 401


def test_get_me(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    login = client.post("/api/auth/login", json={
        "email": STUDENT_PAYLOAD["email"],
        "password": STUDENT_PAYLOAD["password"],
    })
    token = login.json()["access_token"]
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == STUDENT_PAYLOAD["email"]


def test_logout_invalidates_token(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    login = client.post("/api/auth/login", json={
        "email": STUDENT_PAYLOAD["email"],
        "password": STUDENT_PAYLOAD["password"],
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    logout = client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 200

    # Token should now be revoked
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401


def test_register_teacher_requires_admin(client):
    """Teacher registration must be rejected without an admin token."""
    res = client.post("/api/auth/register/teacher", json={
        "email": "teacher@test.com",
        "full_name": "Test Teacher",
        "password": "Teacher@1234",
        "employee_id": "T001",
        "department": "CS",
    })
    assert res.status_code == 403


def test_register_teacher_as_admin(client, admin_token):
    res = client.post(
        "/api/auth/register/teacher",
        json={
            "email": "teacher2@test.com",
            "full_name": "Test Teacher 2",
            "password": "Teacher@1234",
            "employee_id": "T002",
            "department": "CS",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201


def test_refresh_token_flow(client):
    client.post("/api/auth/register/student", json=STUDENT_PAYLOAD)
    login_res = client.post("/api/auth/login", json={
        "email": STUDENT_PAYLOAD["email"],
        "password": STUDENT_PAYLOAD["password"],
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "refresh_token" in data
    
    refresh_res = client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert refresh_res.status_code == 200
    refreshed_data = refresh_res.json()
    assert "access_token" in refreshed_data
    assert "refresh_token" in refreshed_data

