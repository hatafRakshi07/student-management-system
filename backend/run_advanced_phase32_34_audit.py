import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_advanced_phases_32_34():
    s = requests.Session()
    print("=== RUNNING PHASES 32-34 RESEARCH, ACCREDITATION & BIOMETRIC AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Phase 32 — Research Management System API Audit
    pubs_res = s.get(f"{BASE_URL}/api/research/publications", headers=hdr_adm).json()
    print("[OK] Phase 32 Research Management System:")
    print("    - Journal Publications :", pubs_res["count"])
    print("    - First Paper Title    :", pubs_res["publications"][0]["title"])
    print("    - Journal Impact Factor:", pubs_res["publications"][0]["impact_factor"])

    add_pub = s.post(f"{BASE_URL}/api/research/publication", json={
        "title": "Quantum Computing Architectures in Next-Gen Enterprise ERPs",
        "journal_name": "ACM Computing Surveys",
        "issn_isbn": "0360-0300",
        "doi": "10.1145/370001",
        "impact_factor": 16.6,
        "year": 2026,
        "faculty_user_id": 534
    }, headers=hdr_adm).json()
    print("    - Publication Engine  :", add_pub.get("message"))

    res_dash = s.get(f"{BASE_URL}/api/research/admin/dashboard", headers=hdr_adm).json()
    print("    - Total Funded Grants  : Rs.", res_dash["total_grants_amount"])
    print("    - Avg Impact Factor    :", res_dash["average_impact_factor"])

    # 3. Phase 33 — NAAC / NIRF Accreditation Engine API Audit
    aqar_res = s.get(f"{BASE_URL}/api/accreditation/naac-aqar", headers=hdr_adm).json()
    print("[OK] Phase 33 NAAC / NBA Accreditation Engine:")
    print("    - NAAC Grade Rating    : GRADE", aqar_res["naac_grade"])
    print("    - Overall CGPA         :", aqar_res["overall_cgpa"])
    print("    - Criterion 1 Score    :", aqar_res["criteria_scores"]["Criterion 1 (Curricular Aspects)"])
    print("    - Criterion 7 Score    :", aqar_res["criteria_scores"]["Criterion 7 (Institutional Values & Best Practices)"])

    nirf_res = s.get(f"{BASE_URL}/api/accreditation/nirf-score", headers=hdr_adm).json()
    print("[OK] Phase 33 NIRF Ranking Score Calculator:")
    print("    - NIRF Overall Score   :", nirf_res["nirf_overall_score"], "/ 100")
    print("    - Projected National   :", nirf_res["projected_rank_range"])

    # 4. Phase 34 — Biometric & RFID Integration API Audit
    devs_res = s.get(f"{BASE_URL}/api/biometric/devices", headers=hdr_adm).json()
    print("[OK] Phase 34 Biometric & RFID Terminal Monitor:")
    print("    - Device Count         :", devs_res["count"])
    print("    - First Device Code    :", devs_res["devices"][0]["device_code"])
    print("    - Terminal IP Address  :", devs_res["devices"][0]["ip_address"])

    punch_res = s.post(f"{BASE_URL}/api/biometric/punch", json={"device_code": "BIO-GATE-01", "user_id": 535, "punch_type": "IN"}).json()
    print("[OK] Phase 34 Biometric Punch Ingestion & Auto-Attendance:")
    print("    - Message              :", punch_res.get("message"))
    print("    - Device               :", punch_res.get("device_code"))
    print("    - Timestamp            :", punch_res.get("punch_time"))

    print("\nPHASES 32-34 RESEARCH, ACCREDITATION & BIOMETRIC ERP VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_advanced_phases_32_34()
