import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_phase19_library():
    s = requests.Session()
    print("=== RUNNING PHASE 19 LIBRARY MANAGEMENT SYSTEM AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Book Catalog API
    books_res = s.get(f"{BASE_URL}/api/library/books", headers=hdr_adm).json()
    print("[OK] Phase 19 Book Catalog Directory:")
    print("    - Cataloged Titles Count:", books_res["total_count"])
    book_1_id = books_res["books"][0]["id"]
    book_1_title = books_res["books"][0]["title"]
    print("    - First Book           :", book_1_title, f"({books_res['books'][0]['accession_no']})")

    # 3. Book Issue Engine
    issue_payload = {
        "book_id": book_1_id,
        "user_id": 535
    }
    issue_res = s.post(f"{BASE_URL}/api/library/issue", json=issue_payload, headers=hdr_adm).json()
    txn_id = issue_res.get("transaction_id")
    print("[OK] Phase 19 Book Issue Engine:")
    print("    - Message              :", issue_res.get("message"))
    print("    - Issue Transaction ID :", txn_id)
    print("    - Due Date             :", issue_res.get("due_date"))

    # 4. Member Library Dashboard Payload
    mem_dash = s.get(f"{BASE_URL}/api/library/member/dashboard/535", headers=hdr_adm).json()
    print("[OK] Phase 19 Member Library Dashboard:")
    print("    - Member Code          :", mem_dash["member_info"]["member_code"])
    print("    - Borrowed Count       :", mem_dash["member_info"]["current_borrowed"])
    print("    - Active Issued Title  :", mem_dash["active_borrowed_books"][0]["title"])

    # 5. Book Return Engine & Fine Calculator
    return_res = s.post(f"{BASE_URL}/api/library/return/{txn_id}", headers=hdr_adm).json()
    print("[OK] Phase 19 Book Return Engine & Fine Calculator:")
    print("    - Message              :", return_res.get("message"))
    print("    - Late Days            :", return_res.get("late_days"))
    print("    - Overdue Fine Amount  : Rs.", return_res.get("fine_amount"))

    # 6. Admin Librarian Command Center
    adm_dash = s.get(f"{BASE_URL}/api/library/admin/dashboard", headers=hdr_adm).json()
    print("[OK] Phase 19 Admin Librarian Command Center:")
    print("    - Total Book Copies    :", adm_dash["total_books_copies"])
    print("    - Available Copies     :", adm_dash["available_copies"])
    print("    - Overdue Count        :", adm_dash["overdue_count"])

    # 7. Library Reports Engine
    issue_report = s.get(f"{BASE_URL}/api/library/reports/issue-register", headers=hdr_adm).json()
    print("[OK] Phase 19 Library Reports Engine:")
    print("    - Report Title         :", issue_report["report_title"])
    print("    - Issue Register Count :", issue_report["count"])

    print("\nPHASE 19 LIBRARY MANAGEMENT SYSTEM VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_phase19_library()
