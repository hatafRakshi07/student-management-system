import pytest


def test_notes_and_event_ledger_workflow(client, admin_auth_headers, teacher_auth_headers, student_auth_headers):
    # 1. Test Teacher uploading study note
    file_payload = {"file": ("test_lecture.pdf", b"%PDF-1.4 test study note content", "application/pdf")}
    data_payload = {
        "title": "Unit 1 - Algorithm Complexity & Big O",
        "subject": "Data Structures",
        "department": "Computer Science",
        "class_name": "BCA 1st Year",
        "semester": "Semester 1",
        "description": "Lecture handout for Big O notation",
    }
    res = client.post(
        "/api/notes/upload",
        data=data_payload,
        files=file_payload,
        headers=teacher_auth_headers,
    )
    assert res.status_code == 201
    note_id = res.json()["note"]["id"]

    # 2. Test Student listing notes
    res_list = client.get(
        "/api/notes?subject=Data Structures",
        headers=student_auth_headers,
    )
    assert res_list.status_code == 200
    notes = res_list.json()["notes"]
    assert len(notes) >= 1
    assert notes[0]["title"] == "Unit 1 - Algorithm Complexity & Big O"

    # 3. Test Admin Event Ledger: Create Fresher Party Event
    event_payload = {
        "name": "Fresher's Welcome Party 2026",
        "event_type": "FRESHER_PARTY",
        "academic_year": "2026-27",
        "target_budget": 50000.0,
        "event_date": "2026-09-25",
        "venue": "College Lawn",
        "coordinator_name": "Prof. R. K. Sharma",
        "coordinator_contact": "+91 98290 11223",
        "description": "Orientation and gala for first year batch",
    }
    res_ev = client.post(
        "/api/finance/events",
        json=event_payload,
        headers=admin_auth_headers,
    )
    assert res_ev.status_code == 201
    event_id = res_ev.json()["event_id"]

    # 4. Add Collection (Income) item
    income_item = {
        "item_name": "Student Pass Sales (100 passes @ ₹300)",
        "entry_type": "INCOME",
        "category": "Student Contribution",
        "amount": 30000.0,
        "payee_or_donor": "2nd Year Committee",
        "payment_mode": "UPI",
        "reference_no": "UPI-REC-01",
        "item_date": "2026-09-20",
    }
    res_inc = client.post(
        f"/api/finance/events/{event_id}/items",
        json=income_item,
        headers=admin_auth_headers,
    )
    assert res_inc.status_code == 201

    # 5. Add Expense items: DJ & Catering
    dj_expense = {
        "item_name": "DJ & Sound System Setup",
        "entry_type": "EXPENSE",
        "category": "DJ & Sound",
        "amount": 12000.0,
        "payee_or_donor": "Rockers DJ Kota",
        "payment_mode": "UPI",
        "reference_no": "BILL-DJ-49",
        "item_date": "2026-09-25",
    }
    catering_expense = {
        "item_name": "Snacks & Refreshment Buffet",
        "entry_type": "EXPENSE",
        "category": "Catering & Food",
        "amount": 10000.0,
        "payee_or_donor": "Royal Caterers",
        "payment_mode": "CASH",
        "reference_no": "VOUCH-CAT-82",
        "item_date": "2026-09-25",
    }
    res_exp1 = client.post(
        f"/api/finance/events/{event_id}/items",
        json=dj_expense,
        headers=admin_auth_headers,
    )
    res_exp2 = client.post(
        f"/api/finance/events/{event_id}/items",
        json=catering_expense,
        headers=admin_auth_headers,
    )
    assert res_exp1.status_code == 201
    assert res_exp2.status_code == 201

    # 6. Check Event Ledger calculation (Total Collected: 30k, Total Spent: 22k, Net Surplus: 8k)
    res_details = client.get(
        f"/api/finance/events/{event_id}",
        headers=admin_auth_headers,
    )
    assert res_details.status_code == 200
    summary = res_details.json()["summary"]
    assert summary["total_collected"] == 30000.0
    assert summary["total_spent"] == 22000.0
    assert summary["net_balance"] == 8000.0
    assert len(res_details.json()["items"]) == 3
