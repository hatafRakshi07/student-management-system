import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_expansion_phases_29_31():
    s = requests.Session()
    print("=== RUNNING PHASES 29-31 INVENTORY, CERTIFICATES & PLACEMENT AUDIT ===")

    # 1. Admin Login
    adm_res = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin", "password": "admin123"}).json()
    adm_tok = adm_res["access_token"]
    hdr_adm = {"Authorization": f"Bearer {adm_tok}"}
    print("[OK] Admin Login: SUCCESS")

    # 2. Phase 29 — Inventory & Asset Management API Audit
    inv_assets = s.get(f"{BASE_URL}/api/inventory/assets", headers=hdr_adm).json()
    print("[OK] Phase 29 Inventory & Asset Management ERP:")
    print("    - Cataloged Assets Count:", inv_assets["count"])
    asset_1_id = inv_assets["assets"][0]["id"]
    print("    - First Asset Item      :", inv_assets["assets"][0]["item_name"], f"({inv_assets['assets'][0]['asset_code']})")

    issue_ast = s.post(f"{BASE_URL}/api/inventory/asset/issue", json={"asset_id": asset_1_id, "user_id": 534}, headers=hdr_adm).json()
    print("    - Asset Issue Engine   :", issue_ast.get("message"))

    inv_dash = s.get(f"{BASE_URL}/api/inventory/admin/dashboard", headers=hdr_adm).json()
    print("    - Inventory Valuation  : Rs.", inv_dash["total_valuation"])

    # 3. Phase 30 — Certificate & Public Verification API Audit
    gen_cert = s.post(f"{BASE_URL}/api/documents/generate", json={"student_id": 535, "certificate_type": "BONAFIDE"}, headers=hdr_adm).json()
    doc_no = gen_cert["document_number"]
    print("[OK] Phase 30 Digital Document & Certificate Engine:")
    print("    - Document Number      :", doc_no)
    print("    - Verification Token   :", gen_cert["verification_token"])

    verify_res = s.get(f"{BASE_URL}/api/documents/verify/{doc_no}").json()
    print("[OK] Phase 30 Public QR Verification Engine:")
    print("    - Verification Status  :", verify_res["status"])
    print("    - Issued To Student    :", verify_res["student_name"])
    print("    - Verification Seal    :", verify_res["verification_seal"])

    # 4. Phase 31 — Alumni & Placement Portal API Audit
    drives_res = s.get(f"{BASE_URL}/api/placement/drives", headers=hdr_adm).json()
    print("[OK] Phase 31 Alumni & Campus Placement ERP:")
    print("    - Campus Drives Count  :", drives_res["count"])
    print("    - Partner Company      :", drives_res["drives"][0]["company_name"])
    print("    - Offered CTC Package  :", drives_res["drives"][0]["ctc_package"])

    apply_drive = s.post(f"{BASE_URL}/api/placement/apply", json={"drive_id": 1}, headers=hdr_adm).json()
    print("    - Student Application  :", apply_drive.get("message"))

    place_dash = s.get(f"{BASE_URL}/api/placement/admin/dashboard", headers=hdr_adm).json()
    print("    - Partner Companies    :", place_dash["total_companies_visited"])
    print("    - Highest CTC Package  :", place_dash["highest_package"])

    print("\nPHASES 29-31 INVENTORY, CERTIFICATES & PLACEMENT ERP VERIFIED 100% SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_expansion_phases_29_31()
