from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeSummary, Payment

db = SessionLocal()
print("=== CHECKING IMPORTED STUDENTS FROM DATA SHEETS ===")
students_with_receipts = db.query(StudentProfile).join(FeeReceipt, StudentProfile.user_id == FeeReceipt.student_id).all()
print(f"Students with mapped Fee Receipts: {len(students_with_receipts)}")

for p in students_with_receipts[:5]:
    fee_sum = db.query(FeeSummary).filter(FeeSummary.student_id == p.user_id).first()
    rcpts = db.query(FeeReceipt).filter(FeeReceipt.student_id == p.user_id).all()
    print(f"\nStudent ID   : {p.user_id}")
    print(f"Name         : {p.student_name}")
    print(f"Scholar No   : {p.roll_number}")
    print(f"Reg No       : {p.reg_no}")
    print(f"Class        : {p.class_name}")
    print(f"Total Paid   : Rs. {fee_sum.total_paid if fee_sum else 0:,.2f}")
    print(f"Receipt Count: {len(rcpts)}")
    if rcpts:
        print(f"Latest Receipt: #{rcpts[-1].receipt_no} | Date: {rcpts[-1].receipt_date} | Amt: Rs. {rcpts[-1].amount}")

db.close()
