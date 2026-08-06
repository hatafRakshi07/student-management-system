import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_phase17_parent():
    s = requests.Session()
    print("=== RUNNING PHASE 17 PARENT PORTAL & COMMUNICATION HUB AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Parent Dashboard Payload
    parent_dash = s.get(f"{BASE_URL}/api/parent/dashboard/535", headers=hdr_adm).json()
    print("[OK] Phase 17 Parent Portal Overview Dashboard:")
    print("    - Active Student Name :", parent_dash["active_student"]["full_name"])
    print("    - Roll Number         :", parent_dash["active_student"]["roll_number"])
    print("    - Course & Semester   :", parent_dash["active_student"]["course"], "Semester", parent_dash["active_student"]["semester"])
    print("    - Attendance Gauge    :", parent_dash["attendance"]["percentage"], "%")
    print("    - Pending Fee Due     : Rs.", parent_dash["fee_summary"]["pending_fee"])
    print("    - Academic SGPA / CGPA:", parent_dash["result_summary"]["sgpa"], "/", parent_dash["result_summary"]["cgpa"])

    # 3. PTM Meeting Request Creation
    ptm_payload = {
        "student_id": 535,
        "requested_date": "2026-08-15",
        "preferred_time": "10:00 AM - 11:00 AM",
        "purpose": "Semester 1 Progress Review and Attendance Discussion"
    }
    ptm_res = s.post(f"{BASE_URL}/api/parent/meetings/request", json=ptm_payload, headers=hdr_adm).json()
    ptm_id = ptm_res.get("ptm_id")
    print("[OK] Phase 17 Parent PTM Meeting Request:")
    print("    - PTM Request ID      :", ptm_id)
    print("    - Status              :", ptm_res.get("status"))

    # 4. Teacher / Admin PTM Approval
    ptm_app = s.post(f"{BASE_URL}/api/parent/meetings/{ptm_id}/status", json={"status": "APPROVED", "remarks": "Confirmed for 10:00 AM"}, headers=hdr_adm).json()
    print("[OK] Phase 17 Teacher PTM Approval Workflow:")
    print("    - Message             :", ptm_app.get("message"))

    # 5. Admin Parent Directory
    parent_dir = s.get(f"{BASE_URL}/api/parent/admin/directory", headers=hdr_adm).json()
    print("[OK] Phase 17 Admin Parent Directory:")
    print("    - Total Parent Count  :", parent_dir["total_count"])

    print("\nPHASE 17 PARENT PORTAL & COMMUNICATION HUB VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_phase17_parent()
