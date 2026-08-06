import sys
import os
import json

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import create_tables, SessionLocal
from app.services.import_service import run_full_import
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeSummary, FeeTransaction, ImportLog

def main():
    print("Initializing Database Tables...")
    create_tables()

    db = SessionLocal()
    try:
        print("Running Automated Data Migration System over 'data sheets/'...")
        report = run_full_import(db)

        print("\n================ MIGRATION REPORT ================")
        print(f"Status                       : {report.get('status')}")
        print(f"Files Scanned                : {report.get('files_scanned')}")
        print(f"Files Imported               : {report.get('files_imported')}")
        print(f"Student Records Found        : {report.get('student_records_found')}")
        print(f"Unique Master Students       : {report.get('unique_students')}")
        print(f"Students Imported (New)      : {report.get('students_imported')}")
        print(f"Students Updated (Merged)    : {report.get('students_updated')}")
        print(f"Academic Records Added       : {report.get('academic_records_added')}")
        print(f"Fee Records Found            : {report.get('fee_records_found')}")
        print(f"Fee Receipts Added           : {report.get('fee_receipts_added')}")
        print(f"Fee Transactions Imported    : {report.get('fee_transactions_imported')}")
        print(f"Duplicate Receipts Skipped   : {report.get('duplicate_receipts_skipped')}")
        print(f"Unmatched Fee Records        : {report.get('unmatched_fee_records')}")
        print(f"Users Created                : {report.get('users_created')}")
        print(f"Duplicate Usernames Fixed    : {report.get('duplicate_usernames_fixed')}")
        print(f"Errors                       : {len(report.get('errors', []))}")
        print(f"Warnings                     : {len(report.get('warnings', []))}")
        print("==================================================\n")

        # Database Integrity Validations (Step 19)
        total_students_in_db = db.query(User).filter(User.role == UserRole.student).count()
        total_profiles_in_db = db.query(StudentProfile).count()
        total_academic_in_db = db.query(StudentAcademicHistory).count()
        total_receipts_in_db = db.query(FeeReceipt).count()
        total_summaries_in_db = db.query(FeeSummary).count()

        print(f"DB Check - Total Student Users  : {total_students_in_db}")
        print(f"DB Check - Total StudentProfiles: {total_profiles_in_db}")
        print(f"DB Check - Academic History Recs: {total_academic_in_db}")
        print(f"DB Check - Total Fee Receipts   : {total_receipts_in_db}")
        print(f"DB Check - Fee Summaries Count  : {total_summaries_in_db}")

        assert total_students_in_db > 0, "No students found in DB!"
        assert total_receipts_in_db > 0, "No fee receipts found in DB!"
        assert total_summaries_in_db == total_students_in_db, "Fee summary count mismatch!"

        # Test Re-import / Idempotency (Step 16)
        print("\nTesting Re-Import Idempotency (Step 16)...")
        re_report = run_full_import(db)
        print(f"Re-Import Status             : {re_report.get('status')}")
        print(f"New Students Imported on Re  : {re_report.get('students_imported')}")
        print(f"Fee Receipts Added on Re     : {re_report.get('fee_receipts_added')}")

        assert re_report.get('students_imported') == 0, "Re-import should not create duplicate students!"
        assert re_report.get('fee_receipts_added') == 0, "Re-import should not create duplicate fee receipts!"

        print("\nSUCCESS! All migration and database integrity validations passed!")

    finally:
        db.close()

if __name__ == "__main__":
    main()
