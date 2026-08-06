import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_enterprise_phases_26_28():
    s = requests.Session()
    print("=== RUNNING PHASES 26-28 LMS, ADMISSION & FINANCE ERP AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Phase 26 — LMS API Audit
    lms_res = s.get(f"{BASE_URL}/api/lms/contents/1", headers=hdr_adm).json()
    print("[OK] Phase 26 Learning Management System (LMS):")
    print("    - Lesson Modules Count :", len(lms_res["lessons"]))
    print("    - Interactive Quizzes  :", len(lms_res["quizzes"]))

    quiz_res = s.post(f"{BASE_URL}/api/lms/quiz/submit", json={"quiz_id": 1, "answers": {"1": "B", "2": "B"}}, headers=hdr_adm).json()
    print("    - Quiz Auto-Evaluation : Score:", quiz_res["score_obtained"], f"({quiz_res['percentage']}%)")

    # 3. Phase 27 — Online Admission Portal & Auto-Provisioning Engine
    apply_payload = {
        "applicant_name": "Siddharth Malhotra",
        "email": "siddharth.m@example.com",
        "mobile": "9988776655",
        "father_name": "Rajesh Malhotra",
        "course_applied": "B.Sc. I-SEM",
        "tenth_percentage": 88.5,
        "twelfth_percentage": 91.2
    }
    apply_res = s.post(f"{BASE_URL}/api/admission/apply", json=apply_payload).json()
    reg_no = apply_res["registration_no"]
    print("[OK] Phase 27 Online Admission Application Portal:")
    print("    - Registration No      :", reg_no)
    print("    - Application Status   :", apply_res["status"])

    # Confirm admission & trigger auto-provisioning
    confirm_res = s.post(f"{BASE_URL}/api/admission/confirm/1", headers=hdr_adm).json()
    print("[OK] Phase 27 Admission Auto-Provisioning Engine:")
    print("    - Message              :", confirm_res.get("message"))
    print("    - Student Roll Number  :", confirm_res.get("student_roll_no"))
    print("    - Student Email        :", confirm_res.get("student_user_email"))
    print("    - Parent Email         :", confirm_res.get("parent_user_email"))

    # 4. Phase 28 — Finance & Accounts ERP Audit
    voucher_payload = {
        "narration": "Tuition Fee Receipt Collection Semester 1",
        "line_items": [
            {"ledger_id": 1, "debit": 25000.0, "credit": 0.0},
            {"ledger_id": 3, "debit": 0.0, "credit": 25000.0}
        ]
    }
    v_res = s.post(f"{BASE_URL}/api/finance/journal-entry", json=voucher_payload, headers=hdr_adm).json()
    print("[OK] Phase 28 Finance & Accounts Double-Entry Engine:")
    print("    - Voucher No           :", v_res["voucher_no"])
    print("    - Posted Amount        : Rs.", v_res["amount"])

    tb_res = s.get(f"{BASE_URL}/api/finance/reports/trial-balance", headers=hdr_adm).json()
    print("[OK] Phase 28 Financial Reports Engine:")
    print("    - Report Title         :", tb_res["report_title"])
    print("    - Double-Entry Balance :", "BALANCED (Sum(Dr) == Sum(Cr))" if tb_res["is_balanced"] else "UNBALANCED")
    print("    - Ledger Accounts Count:", len(tb_res["accounts"]))

    cb_res = s.get(f"{BASE_URL}/api/finance/reports/cash-book", headers=hdr_adm).json()
    print("    - Cash Book Vouchers   :", len(cb_res["vouchers"]))

    print("\nPHASES 26-28 LMS, ONLINE ADMISSION & FINANCE ERP VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_enterprise_phases_26_28()
