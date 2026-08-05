"""Tests for fee management and payment checkout endpoints."""


def test_list_fees(client, admin_token):
    res = client.get("/api/fees", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "fees" in res.json()


def test_fee_stats(client, admin_token):
    res = client.get("/api/fees/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "total" in res.json()


def test_create_and_checkout_fee(client, admin_token):
    # 1. Create student
    res_student = client.post("/api/auth/register/student", json={
        "email": "fee_student@test.com",
        "full_name": "Fee Student",
        "password": "Student@1234",
        "phone": "9000000004",
        "roll_number": "S004",
        "department": "CS",
        "class_name": "CS-3A",
        "section": "A",
        "semester": 3,
        "year": 2,
    })
    student_id = res_student.json()["user_id"]

    # 2. Create fee
    res_fee = client.post(
        "/api/fees",
        json={
            "student_id": student_id,
            "amount": 5000.0,
            "fee_type": "Tuition Fee",
            "due_date": "2026-10-01"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_fee.status_code == 201
    fee_id = res_fee.json()["id"]

    # 3. Checkout payment
    res_checkout = client.post(f"/api/fees/{fee_id}/checkout")
    assert res_checkout.status_code == 200
    assert "checkout_session" in res_checkout.json()
    order_id = res_checkout.json()["checkout_session"]["order_id"]

    # 4. Verify payment
    res_verify = client.post(
        f"/api/fees/{fee_id}/verify-payment",
        json={"order_id": order_id, "payment_id": "PAY_MOCK_123456"}
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "paid"
