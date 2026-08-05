import pytest
from datetime import datetime, timedelta


def test_submit_and_manage_leaves(client, student_auth_headers, teacher_auth_headers):
    # Student submits leave request
    leave_data = {
        "reason": "Medical leave due to flu",
        "from_date": (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "to_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
    }
    resp = client.post("/api/leaves", json=leave_data, headers=student_auth_headers)
    assert resp.status_code == 201

    # Student lists own leaves
    resp_list = client.get("/api/leaves/my", headers=student_auth_headers)
    assert resp_list.status_code == 200
    leaves = resp_list.json()["leaves"]
    assert len(leaves) >= 1
    leave_id = leaves[0]["id"]

    # Teacher / Admin reviews leave
    resp_approve = client.put(f"/api/leaves/{leave_id}/review", json={"status": "approved", "review_remarks": "Get well soon"}, headers=teacher_auth_headers)
    assert resp_approve.status_code == 200
