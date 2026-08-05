import pytest


def test_send_and_read_messages(client, student_auth_headers, teacher_auth_headers):
    # Get teacher ID from /api/auth/me using teacher headers
    me_resp = client.get("/api/auth/me", headers=teacher_auth_headers)
    assert me_resp.status_code == 200
    teacher_id = me_resp.json()["id"]

    # Student sends message to teacher
    send_resp = client.post(
        "/api/messages/send",
        json={"recipient_id": teacher_id, "content": "Hello Professor!"},
        headers=student_auth_headers
    )
    assert send_resp.status_code == 201
    msg_id = send_resp.json()["id"]

    # Teacher gets conversation
    student_me = client.get("/api/auth/me", headers=student_auth_headers).json()
    student_id = student_me["id"]

    conv_resp = client.get(f"/api/messages/conversation/{student_id}", headers=teacher_auth_headers)
    assert conv_resp.status_code == 200
    assert len(conv_resp.json()["messages"]) >= 1

    # Teacher marks message as read
    read_resp = client.put(f"/api/messages/read/{msg_id}", headers=teacher_auth_headers)
    assert read_resp.status_code == 200
