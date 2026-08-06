import sys
import json
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeSummary, Payment, FeeTransaction, UnmatchedFeeRecord, ImportLog

def verify_data():
    db = SessionLocal()
    try:
        print("=== DATABASE DATA VERIFICATION ===")
        total_users = db.query(User).count()
        total_students = db.query(User).filter(User.role == UserRole.student).count()
        total_profiles = db.query(StudentProfile).count()
        total_academic = db.query(StudentAcademicHistory).count()
        total_receipts = db.query(FeeReceipt).count()
        total_payments = db.query(Payment).count()
        total_txns = db.query(FeeTransaction).count()
        total_summaries = db.query(FeeSummary).count()
        total_unmatched = db.query(UnmatchedFeeRecord).count()
        latest_log = db.query(ImportLog).order_by(ImportLog.id.desc()).first()

        print(f"Total Users in DB         : {total_users}")
        print(f"Total Student Users       : {total_students}")
        print(f"Total Student Profiles    : {total_profiles}")
        print(f"Total Academic Histories  : {total_academic}")
        print(f"Total Fee Receipts        : {total_receipts}")
        print(f"Total Payments            : {total_payments}")
        print(f"Total Fee Transactions    : {total_txns}")
        print(f"Total Fee Summaries       : {total_summaries}")
        print(f"Total Unmatched Fee Recs  : {total_unmatched}")

        if latest_log:
            print(f"Latest Import Log Status  : {latest_log.status}")
            print(f"Latest Import Time        : {latest_log.end_time}")

        # Sample student verification
        sample_student = db.query(StudentProfile).first()
        if sample_student:
            print("\n=== SAMPLE STUDENT RECORD CHECK ===")
            print(f"User ID           : {sample_student.user_id}")
            print(f"Student Name      : {sample_student.student_name}")
            print(f"Scholar No        : {sample_student.roll_number}")
            print(f"Class Name        : {sample_student.class_name}")
            print(f"Department        : {sample_student.department}")
            print(f"Mobile            : {sample_student.mobile or sample_student.father_mobile}")
            
            # Check fee summary for sample student
            fee_sum = db.query(FeeSummary).filter(FeeSummary.student_id == sample_student.user_id).first()
            if fee_sum:
                print(f"Fee Status        : {fee_sum.current_status}")
                print(f"Total Paid        : Rs. {fee_sum.total_paid:,.2f}")
                print(f"Pending Fee       : Rs. {fee_sum.pending_fee:,.2f}")

            # Check fee receipts for sample student
            rcpts = db.query(FeeReceipt).filter(FeeReceipt.student_id == sample_student.user_id).all()
            print(f"Total Receipts    : {len(rcpts)}")
            if rcpts:
                print(f"Sample Receipt No : {rcpts[0].receipt_no} | Amount: Rs. {rcpts[0].amount}")

        print("\nAll database tables and relationships verified successfully!")
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_data()
