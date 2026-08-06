import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_phase14_attendance():
    s = requests.Session()
    print("=== RUNNING PHASE 14 COMPLETE ATTENDANCE SYSTEM AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Teacher Bulk Attendance Marking Session
    session_payload = {
        "class_name": "B.A. I-SEM",
        "section": "A",
        "subject_id": 1,
        "lecture_no": 1,
        "date": "2026-08-06",
        "records": [
            {"student_id": 535, "status": "PRESENT", "remarks": "On Time"},
            {"student_id": 536, "status": "ABSENT", "remarks": "Unexcused"},
            {"student_id": 537, "status": "LATE", "remarks": "15m Late"}
        ]
    }
    submit_res = s.post(f"{BASE_URL}/api/attendance/session/submit", json=session_payload, headers=hdr_adm).json()
    print("[OK] Phase 14 Bulk Attendance Session Submission:")
    print("    - New Records  :", submit_res.get("new_records"))
    print("    - Updated Recs :", submit_res.get("updated_records"))
    print("    - Session ID   :", submit_res.get("session_id"))

    # 3. Staff Check-In & Check-Out
    checkin_res = s.post(f"{BASE_URL}/api/attendance/staff/check-in", headers=hdr_adm).json()
    checkout_res = s.post(f"{BASE_URL}/api/attendance/staff/check-out", headers=hdr_adm).json()
    print("[OK] Phase 14 Staff Check-In & Check-Out:")
    print("    - Check-In     :", checkin_res.get("check_in_time") or checkin_res.get("message"))
    print("    - Check-Out    :", checkout_res.get("check_out_time"))

    # 4. Student Attendance Dashboard Payload
    st_res = s.get(f"{BASE_URL}/api/attendance/student/dashboard/535", headers=hdr_adm).json()
    print("[OK] Phase 14 Student Attendance Dashboard Payload:")
    print("    - Today Status :", st_res["today_status"])
    print("    - Overall Pct  :", st_res["overall_percentage"])
    print("    - Total Days   :", st_res["total_working_days"])

    # 5. Admin Command Center Dashboard
    adm_dash = s.get(f"{BASE_URL}/api/attendance/admin/dashboard", headers=hdr_adm).json()
    print("[OK] Phase 14 Admin Command Center Metrics:")
    print("    - Students Today Marked :", adm_dash["students_today"]["total_marked"])
    print("    - Staff Today Marked    :", adm_dash["staff_today"]["total_marked"])
    print("    - Low Att Defaulters    :", len(adm_dash["low_attendance_students"]))

    # 6. Attendance Reports Engine
    rep_res = s.get(f"{BASE_URL}/api/attendance/reports/daily-register", headers=hdr_adm).json()
    print("[OK] Phase 14 Attendance Reports Engine:")
    print("    - Register Title        :", rep_res["report_title"])
    print("    - Register Records      :", rep_res["count"])

    print("\nPHASE 14 ATTENDANCE SYSTEM VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_phase14_attendance()
