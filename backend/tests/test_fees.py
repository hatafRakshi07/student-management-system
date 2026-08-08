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

    # 2. Collect fee
    res_fee = client.post(
        "/api/fees/collect",
        json={
            "student_id": student_id,
            "amount": 5000.0,
            "payment_mode": "CASH",
            "remarks": "Tuition Fee Deposit"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_fee.status_code in (200, 201)
    receipt_id = res_fee.json()["receipt_id"]

    # 3. View receipt
    res_receipt = client.get(f"/api/fees/receipt/{receipt_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_receipt.status_code == 200
    assert "receipt_info" in res_receipt.json()
