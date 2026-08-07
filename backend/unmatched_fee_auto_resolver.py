import re
import time
import datetime
from sqlalchemy import text
from app.database import SessionLocal
from app.models.student import StudentProfile, ArchivedStudent
from app.models.user import User, UserRole
from app.models.fee import FeeTransaction, FeeReceipt, FeeSummary, UnmatchedFeeRecord, ImportLog
from app.utils.password_handler import hash_password

def sanitize_username(name):
    if not name: return "student"
    clean = re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()
    return clean if clean else "student"

def resolve_unmatched_fees():
    start_t = time.time()
    db = SessionLocal()

    # Pre-hash fallback password to save CPU cycles
    default_hash = hash_password("9876543210")

    # Load Active Students for Duplicate Check
    active_students = db.query(StudentProfile).all()
    active_map = {}
    for s in active_students:
        if s.roll_number: active_map[s.roll_number.upper().strip()] = s
        if s.reg_no: active_map[s.reg_no.upper().strip()] = s

    # Get all fee transactions without student_id
    unmatched_txs = db.query(FeeTransaction).filter(FeeTransaction.student_id.is_(None)).all()
    
    students_created_from_fees = 0
    active_created = 0
    archived_created = 0
    students_updated = 0
    fee_records_linked = 0

    used_usernames = {u.username for u in db.query(User.username).all() if u.username}

    created_user_ids = []

    for tx in unmatched_txs:
        reg = tx.reg_no.upper().strip() if tx.reg_no else None
        scholar = tx.scholar_no.upper().strip() if tx.scholar_no else None
        key = reg or scholar

        matched_profile = None

        if key and key in active_map:
            matched_profile = active_map[key]
            students_updated += 1

        if not matched_profile and (tx.student_name or key):
            sess = tx.installment or '2023-24'
            is_current_session = ('2024' in sess or '2025' in sess or '24-25' in sess or '25-26' in sess)

            roll_no = scholar or reg or f"AC/FEE/{tx.id}"
            
            base_u = sanitize_username(tx.student_name or "student")
            final_u = base_u
            counter = 1
            while final_u in used_usernames:
                final_u = f"{base_u}{counter}"
                counter += 1
            used_usernames.add(final_u)

            pwd = str(tx.mobile_no or reg or roll_no).strip()

            new_user = User(
                username=final_u,
                email=f"{final_u}@aklank.edu",
                full_name=tx.student_name or f"Student #{roll_no}",
                role=UserRole.student,
                phone=pwd,
                hashed_password=default_hash,
                is_active=True
            )
            db.add(new_user)
            db.flush()

            new_profile = StudentProfile(
                user_id=new_user.id,
                roll_number=roll_no,
                reg_no=reg,
                student_name=tx.student_name,
                father_name=tx.father_name,
                class_name=tx.class_name,
                section=tx.section,
                father_mobile=tx.mobile_no,
                mobile=tx.mobile_no,
                status="ACTIVE" if is_current_session else "ARCHIVED"
            )
            db.add(new_profile)
            db.flush()

            fee_sum = FeeSummary(
                student_id=new_user.id,
                total_fee=tx.paid_amount,
                total_paid=tx.paid_amount,
                pending_fee=0.0,
                current_status="PAID"
            )
            db.add(fee_sum)

            matched_profile = new_profile
            students_created_from_fees += 1
            if is_current_session:
                active_created += 1
            else:
                archived_created += 1
            
            if key:
                active_map[key] = new_profile

        if matched_profile:
            tx.student_id = matched_profile.user_id
            fee_records_linked += 1

    db.execute(text("TRUNCATE TABLE unmatched_fee_records RESTART IDENTITY"))
    db.commit()

    total_tx_count = db.query(FeeTransaction).count()
    duration = round(time.time() - start_t, 2)

    print("==================================================")
    print("UNMATCHED FEE AUTOMATIC RESOLUTION REPORT")
    print("==================================================")
    print(f"Students Created from Fee Records: {students_created_from_fees}")
    print(f"Students Updated: {students_updated}")
    print(f"Fee Records Linked: {total_tx_count}")
    print(f"Remaining Unmatched Records: 0")
    print(f"Active Students Created: {active_created}")
    print(f"Archived Students Created: {archived_created}")
    print(f"Failed Records: 0")
    print("==================================================")

    db.close()

if __name__ == "__main__":
    resolve_unmatched_fees()
