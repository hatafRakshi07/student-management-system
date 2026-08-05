"""Tests for notices and messaging endpoints."""


def test_list_notices(client, admin_token):
    res = client.get("/api/notices", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), (list, dict))



def test_send_and_get_message(client, admin_token):
    # Register another user
    res_user = client.post("/api/auth/register/student", json={
        "email": "msg_student@test.com",
        "full_name": "Msg Student",
        "password": "Student@1234",
        "phone": "9000000005",
        "roll_number": "S005",
        "department": "CS",
        "class_name": "CS-3A",
        "section": "A",
        "semester": 3,
        "year": 2,
    })
    other_user_id = res_user.json()["user_id"]

    # Send message
    res_send = client.post(
        "/api/messages/send",
        json={"recipient_id": other_user_id, "content": "Hello teacher!"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_send.status_code == 201

    # Fetch conversation
    res_conv = client.get(
        f"/api/messages/conversation/{other_user_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_conv.status_code == 200
    assert len(res_conv.json()["messages"]) > 0
