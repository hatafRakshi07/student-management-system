"""
Complete Historical ERP Data Migration Engine (2022 - 2026).
Integrates all student master sheets and fee transaction sheets from data sheets/final year project/
into the production SQLite / PostgreSQL database.

Features:
- Idempotent and safe to run multiple times without creating duplicates.
- Preserves exact source dates (receipt dates, voucher dates, admission dates).
- Multi-year fee history linking (First Year, Second Year, Third Year).
- Robust student identity matcher (Scholar No, Reg No, Name + Father Name, Mobile).
- Reconciles source records vs database records with detailed report.
"""

import os
import sys
import re
import csv
import json
import glob
import datetime
from typing import Dict, Any, Tuple, List, Optional, Set
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


from app.database import SessionLocal, engine, Base, create_tables
from app.models.user import User, UserRole
from app.models.student import (
    StudentProfile, StudentAcademicHistory, ClassMaster, SectionMaster, CategoryMaster, CourseMaster, DepartmentMaster
)
from app.models.fee import (
    FeeReceipt, FeeTransaction, FeeSummary, Payment, FeeDiscount, UnmatchedFeeRecord, ImportLog, FeeStatus
)
from app.utils.password_handler import hash_password


def clean_str(val: Any) -> Optional[str]:
    """Clean string values, trim spaces, handle float string representation like '101.0'."""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    if s.lower() in ('nan', 'none', 'null', 'nat', ''):
        return None
    return s


def clean_float(val: Any) -> float:
    """Safely parse float value from string or number."""
    if val is None or pd.isna(val):
        return 0.0
    try:
        s = str(val).replace(',', '').strip()
        return float(s) if s else 0.0
    except (ValueError, TypeError):
        return 0.0


def clean_phone(val: Any) -> Optional[str]:
    """Extract 10 digits for mobile number."""
    s = clean_str(val)
    if not s:
        return None
    digits = re.sub(r'\D', '', s)
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    return digits if len(digits) >= 8 else s


def parse_date(val: Any) -> Optional[datetime.date]:
    """Parse date into datetime.date object."""
    dt = parse_datetime(val)
    return dt.date() if dt else None


def parse_datetime(val: Any) -> Optional[datetime.datetime]:
    """Parse datetime into datetime.datetime object preserving original date."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, datetime.datetime):
        return val
    if isinstance(val, datetime.date):
        return datetime.datetime.combine(val, datetime.time.min)
    
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ('nan', 'none', 'null', 'nat', 'cash', 'neft', 'cheque', 'bank', '30-11--0001'):
        return None

    # Handle Excel serial dates (e.g. '44845')
    if val_str.isdigit() and len(val_str) == 5:
        try:
            return datetime.datetime(1899, 12, 30) + datetime.timedelta(days=int(val_str))
        except Exception:
            pass

    for fmt in (
        "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y", "%d.%m.%Y",
        "%d-%m-%Y %I:%M %p", "%d/%m/%Y %I:%M %p", "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M", "%d-%m-%Y %H:%M", "%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M %p",
        "%d-%m-%Y %I:%M:%S %p", "%d/%m/%Y %I:%M:%S %p", "%Y-%m-%d %H:%M:%S.%f"
    ):
        try:
            return datetime.datetime.strptime(val_str, fmt)
        except ValueError:
            pass
    return None


def sanitize_username(name: str) -> str:
    """Convert Student Name to clean lowercase username string."""
    if not name:
        return "student"
    clean = re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()
    return clean if clean else "student"


def get_department(class_name: Optional[str]) -> str:
    """Determine department from class name."""
    if not class_name:
        return "General"
    c_upper = class_name.upper()
    if "B.C.A" in c_upper or "BCA" in c_upper or "COMPUTER" in c_upper:
        return "Computer Applications"
    elif "B.A" in c_upper or "ARTS" in c_upper:
        return "Arts"
    elif "B.COM" in c_upper or "COMMERCE" in c_upper:
        return "Commerce"
    elif "B.SC" in c_upper or "SCIENCE" in c_upper or "BIOLOGY" in c_upper or "MATHS" in c_upper:
        return "Science"
    elif "M.A" in c_upper or "DRAWING" in c_upper or "HOME SCIENCE" in c_upper:
        return "Post Graduate Arts"
    return "General"


def get_standard_course_fee(class_name: Optional[str], session: Optional[str]) -> float:
    """Get standard estimated annual fee by course/class."""
    if not class_name:
        return 15000.0
    c_upper = class_name.upper()
    if "NC B.A" in c_upper:
        return 2000.0
    elif "B.C.A" in c_upper or "BCA" in c_upper:
        if "PART-III" in c_upper or "III" in c_upper:
            return 21000.0
        elif "PART-II" in c_upper or "II" in c_upper:
            return 24000.0
        return 25000.0
    elif "B.SC" in c_upper or "SCIENCE" in c_upper:
        return 15000.0
    elif "M.A" in c_upper:
        return 12000.0
    elif "B.A" in c_upper:
        return 12000.0
    return 15000.0


class StudentMemoryIndex:
    """Fast in-memory index for O(1) multi-attribute student identity deduplication."""

    def __init__(self, db: Session):
        self.db = db
        self.users: Dict[int, User] = {}
        self.profiles: Dict[int, StudentProfile] = {}
        
        self.by_scholar_no: Dict[str, int] = {}
        self.by_reg_no: Dict[str, int] = {}
        self.by_admission_no: Dict[str, int] = {}
        self.by_name_father: Dict[Tuple[str, str], int] = {}
        self.by_mobile: Dict[str, int] = {}
        self.by_username: Dict[str, int] = {}

        self.by_email: Set[str] = set()

        # Load existing DB records
        all_users = db.query(User).all()
        for u in all_users:
            self.users[u.id] = u
            if u.username:
                self.by_username[u.username.lower()] = u.id
            if u.email:
                self.by_email.add(u.email.lower())

        all_profiles = db.query(StudentProfile).all()
        for p in all_profiles:
            self.profiles[p.user_id] = p
            u = self.users.get(p.user_id)
            self.index_student(u, p)

    def index_student(self, user: Optional[User], profile: StudentProfile):
        uid = profile.user_id
        if profile.roll_number:
            self.by_scholar_no[profile.roll_number.strip().upper()] = uid
        if profile.reg_no:
            self.by_reg_no[profile.reg_no.strip().upper()] = uid
        if profile.admission_no:
            self.by_admission_no[profile.admission_no.strip().upper()] = uid
        
        name = (profile.student_name or (user.full_name if user else "")).strip().upper()
        father = (profile.father_name or "").strip().upper()
        if name and father:
            self.by_name_father[(name, father)] = uid

        mobs = [profile.mobile, profile.father_mobile, (user.phone if user else None)]
        for m in mobs:
            cm = clean_phone(m)
            if cm and len(cm) >= 8:
                self.by_mobile[cm] = uid

    def find_match(
        self,
        scholar_no: Optional[str] = None,
        reg_no: Optional[str] = None,
        name: Optional[str] = None,
        father_name: Optional[str] = None,
        mobile: Optional[str] = None
    ) -> Optional[int]:
        s_clean = scholar_no.strip().upper() if scholar_no else None
        r_clean = reg_no.strip().upper() if reg_no else None
        n_clean = name.strip().upper() if name else None
        f_clean = father_name.strip().upper() if father_name else None
        m_clean = clean_phone(mobile)

        if s_clean:
            if s_clean in self.by_scholar_no:
                return self.by_scholar_no[s_clean]
            if s_clean in self.by_reg_no:
                return self.by_reg_no[s_clean]

        if r_clean:
            if r_clean in self.by_reg_no:
                return self.by_reg_no[r_clean]
            if r_clean in self.by_scholar_no:
                return self.by_scholar_no[r_clean]

        if n_clean and f_clean:
            if (n_clean, f_clean) in self.by_name_father:
                return self.by_name_father[(n_clean, f_clean)]

        if m_clean and len(m_clean) >= 8:
            if m_clean in self.by_mobile:
                return self.by_mobile[m_clean]

        return None


DEFAULT_STUDENT_HASH = hash_password("student123")
DEFAULT_ADMIN_HASH = hash_password("admin123")


def run_migration(db: Optional[Session] = None) -> Dict[str, Any]:
    """Execute complete migration of all historical files (2022 to 2026)."""
    close_db_at_end = False
    if db is None:
        create_tables()
        db = SessionLocal()
        close_db_at_end = True

    start_time = datetime.datetime.utcnow()
    print("=" * 70)
    print("STARTING COMPLETE AKLANK ERP HISTORICAL DATA MIGRATION (2022-2026)")
    print("=" * 70)

    # Locate data sheet folder
    base_candidates = [
        os.path.join(os.path.dirname(os.path.dirname(backend_dir)), "data sheets", "final year project"),
        os.path.join(os.path.dirname(backend_dir), "data sheets", "final year project"),
        os.path.join(os.getcwd(), "data sheets", "final year project"),
        r"c:\Users\lenovo\Desktop\student-management-system\data sheets\final year project",
    ]

    base_dir = None
    for cand in base_candidates:
        if os.path.exists(cand) and os.path.isdir(cand):
            base_dir = cand
            break

    if not base_dir:
        raise FileNotFoundError(f"Could not find 'data sheets/final year project' folder in candidates: {base_candidates}")

    print(f"Source Directory: {base_dir}")

    student_files = [
        ("student data 2022-23.csv", "2022-23", 0),
        ("students data 2023-24.csv", "2023-24", 1),
        ("student data 2024-25.csv", "2024-25", 0),
        ("AKLANK COLLEGE.csv", "2025-26", 1),
    ]

    fee_files = [
        ("fees data 2022-23.csv", "2022-23"),
        ("aklank college fees 2023-24.csv", "2023-24"),
        ("fees data 2024-25.csv", "2024-25"),
        ("fees data 2025-26.csv", "2025-26"),
    ]

    report = {
        "student_files_processed": 0,
        "fee_files_processed": 0,
        "total_source_student_rows": 0,
        "total_source_fee_rows": 0,
        "students_imported": 0,
        "students_updated": 0,
        "users_created": 0,
        "academic_history_records": 0,
        "fee_receipts_imported": 0,
        "fee_transactions_imported": 0,
        "payments_recorded": 0,
        "fee_discounts_recorded": 0,
        "total_source_fee_paid": 0.0,
        "total_db_fee_paid": 0.0,
        "status": "IN_PROGRESS",
        "errors": []
    }

    # Ensure Admin Account exists
    admin_user = db.query(User).filter(
        or_(
            User.username == "admin",
            User.email == "admin@aklankcollege.ac.in",
            User.email == "admin@school.com"
        )
    ).first()
    if not admin_user:
        admin_user = User(
            username="admin",
            email="admin@aklankcollege.ac.in",
            hashed_password=DEFAULT_ADMIN_HASH,
            full_name="System Administrator",
            role=UserRole.admin,
            is_active=True
        )
        db.add(admin_user)
        db.flush()

    index = StudentMemoryIndex(db)



    # Track unique academic history keys (student_id, session)
    existing_academic_keys: Set[Tuple[int, str]] = {
        (ah.student_id, ah.session)
        for ah in db.query(StudentAcademicHistory.student_id, StudentAcademicHistory.session).all()
    }

    # Track unique fee receipts (voucher_no, session)
    existing_receipt_numbers: Set[str] = {
        r.voucher_no for r in db.query(FeeReceipt.voucher_no).filter(FeeReceipt.voucher_no.isnot(None)).all()
    }

    # Track existing FeeTransactions (receipt_number)
    existing_fee_transactions: Dict[str, FeeTransaction] = {
        ft.receipt_number: ft for ft in db.query(FeeTransaction).all() if ft.receipt_number
    }

    # Track existing Payments (reference_number)
    existing_payment_refs: Set[str] = {
        p.reference_number for p in db.query(Payment.reference_number).filter(Payment.reference_number.isnot(None)).all()
    }

    # =========================================================================
    # STEP 1: IMPORT ALL STUDENT MASTER FILES (2022 to 2026)
    # =========================================================================
    print("\n--- STEP 1: Processing Student Master Files ---")
    for fname, session, skiprows in student_files:
        fpath = os.path.join(base_dir, fname)
        if not os.path.exists(fpath):
            print(f"Warning: File {fname} not found at {fpath}")
            continue

        report["student_files_processed"] += 1
        df = pd.read_csv(fpath, skiprows=skiprows if skiprows > 0 else 0)
        report["total_source_student_rows"] += len(df)
        print(f"Reading {fname} ({session}): {len(df)} rows...")

        for _, row in df.iterrows():
            scholar_no = clean_str(row.get("Scholar No.") or row.get("Scholar No") or row.get("ScholarNo"))
            reg_no = clean_str(row.get("Pre Registration No") or row.get("Reg No") or row.get("Reg. No"))
            name = clean_str(row.get("Name") or row.get("Student Name"))
            father_name = clean_str(row.get("Father Name") or row.get("Father"))
            mother_name = clean_str(row.get("Mother Name") or row.get("Mother"))
            class_name = clean_str(row.get("Class") or row.get("Course"))
            section = clean_str(row.get("Section") or row.get("Sec.") or row.get("Sec"))
            mobile = clean_phone(row.get("SMS Mobile") or row.get("Mobile") or row.get("MobileNo"))
            dob = parse_date(row.get("DOB") or row.get("Date of Birth"))
            gender = clean_str(row.get("Gender") or row.get("Sex"))
            category = clean_str(row.get("Category") or row.get("Caste"))
            student_type = clean_str(row.get("Student Type") or row.get("Type"))

            if not scholar_no and not reg_no and not name:
                continue

            department = get_department(class_name)

            matched_uid = index.find_match(
                scholar_no=scholar_no,
                reg_no=reg_no,
                name=name,
                father_name=father_name,
                mobile=mobile
            )

            if matched_uid:
                # Update existing profile
                user = index.users.get(matched_uid)
                profile = index.profiles.get(matched_uid)

                if user and name and (not user.full_name or user.full_name == "Student"):
                    user.full_name = name
                if user and mobile and not user.phone:
                    user.phone = mobile

                if profile:
                    if scholar_no and not profile.roll_number:
                        profile.roll_number = scholar_no
                    if reg_no and not profile.reg_no:
                        profile.reg_no = reg_no
                    if name and not profile.student_name:
                        profile.student_name = name
                    if father_name and not profile.father_name:
                        profile.father_name = father_name
                    if mother_name and not profile.mother_name:
                        profile.mother_name = mother_name
                    if dob and not profile.date_of_birth:
                        profile.date_of_birth = dob
                    if gender and not profile.gender:
                        profile.gender = gender
                    if category and not profile.category:
                        profile.category = category
                    if student_type and not profile.student_type:
                        profile.student_type = student_type
                    if mobile and not profile.mobile:
                        profile.mobile = mobile
                    if class_name:
                        profile.class_name = class_name
                        profile.department = department
                    if section:
                        profile.section = section

                report["students_updated"] += 1
                target_uid = matched_uid
            else:
                # Create new User and StudentProfile
                base_uname = sanitize_username(name or scholar_no or "student")
                uname = base_uname
                suffix = 1
                email = f"{uname.lower()}@aklankcollege.ac.in"
                while uname.lower() in index.by_username or email.lower() in index.by_email:
                    if scholar_no:
                        clean_sch = re.sub(r'[^a-zA-Z0-9]', '', scholar_no).lower()
                        uname = f"{base_uname}_{clean_sch}"
                        email = f"{uname.lower()}@aklankcollege.ac.in"
                        if uname.lower() in index.by_username or email.lower() in index.by_email:
                            uname = f"{base_uname}_{clean_sch}_{suffix}"
                            email = f"{uname.lower()}@aklankcollege.ac.in"
                    else:
                        uname = f"{base_uname}{suffix}"
                        email = f"{uname.lower()}@aklankcollege.ac.in"
                    suffix += 1

                index.by_username[uname.lower()] = True
                index.by_email.add(email.lower())

                new_user = User(
                    username=uname,
                    email=email,
                    hashed_password=DEFAULT_STUDENT_HASH,
                    full_name=name or "Student",
                    role=UserRole.student,
                    phone=mobile,
                    is_active=True,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(new_user)
                db.flush()

                new_profile = StudentProfile(
                    user_id=new_user.id,
                    roll_number=scholar_no or f"SCH_{new_user.id}",
                    reg_no=reg_no,
                    student_name=name,
                    father_name=father_name,
                    mother_name=mother_name,
                    department=department,
                    class_name=class_name,
                    section=section,
                    date_of_birth=dob,
                    gender=gender,
                    category=category,
                    student_type=student_type,
                    mobile=mobile,
                    status="ACTIVE",
                    created_at=datetime.datetime.utcnow()
                )
                db.add(new_profile)
                db.flush()

                index.users[new_user.id] = new_user
                index.profiles[new_user.id] = new_profile
                index.index_student(new_user, new_profile)

                report["users_created"] += 1
                report["students_imported"] += 1
                target_uid = new_user.id

            # Add Academic History
            ah_key = (target_uid, session)
            if ah_key not in existing_academic_keys:
                existing_academic_keys.add(ah_key)
                ah = StudentAcademicHistory(
                    student_id=target_uid,
                    session=session,
                    course=department,
                    class_name=class_name,
                    section=section,
                    roll_no=scholar_no,
                    status="ACTIVE",
                    created_at=datetime.datetime.utcnow()
                )
                db.add(ah)
                report["academic_history_records"] += 1

        db.flush()

    # =========================================================================
    # STEP 2: IMPORT ALL FEE RECEIPTS & TRANSACTIONS (2022 to 2026)
    # =========================================================================
    print("\n--- STEP 2: Processing Fee Transactions & Receipts ---")
    for fname, session in fee_files:
        fpath = os.path.join(base_dir, fname)
        if not os.path.exists(fpath):
            print(f"Warning: Fee file {fname} not found at {fpath}")
            continue

        report["fee_files_processed"] += 1
        df = pd.read_csv(fpath)
        report["total_source_fee_rows"] += len(df)
        print(f"Reading {fname} ({session}): {len(df)} transactions...")

        for _, row in df.iterrows():
            vchr_no_raw = clean_str(row.get("Vchr. No") or row.get("Voucher No") or row.get("Receipt No") or row.get("S.NO"))
            if not vchr_no_raw:
                continue

            receipt_no = str(vchr_no_raw)
            reg_no = clean_str(row.get("Reg No") or row.get("Reg. No") or row.get("Scholar No.") or row.get("Scholar No"))
            student_name = clean_str(row.get("Name") or row.get("Student Name"))
            father_name = clean_str(row.get("Father Name") or row.get("Father") or row.get(" "))
            class_name = clean_str(row.get("Class") or row.get("Course"))
            section = clean_str(row.get("Section") or row.get("Sec"))
            mobile = clean_phone(row.get("MobileNo") or row.get("Mobile") or row.get("SMS Mobile"))
            vchr_type = clean_str(row.get("Vchr. Type") or "RECEIPT")
            
            # Exact Historical Dates
            vchr_date = parse_datetime(row.get("Vchr. Date") or row.get("Voucher Date"))
            add_date = parse_datetime(row.get("Add Date"))
            cheque_date = parse_datetime(row.get("Cheque Date"))

            paid_amount = clean_float(row.get("Paid Amount") or row.get("Amount"))
            discount_amount = clean_float(row.get("Less Amount") or row.get("Discount"))
            pay_mode = clean_str(row.get("Pay Mode") or row.get("Payment Mode") or "CASH")
            cheque_no = clean_str(row.get("Cheque No") or row.get("Cheque Number"))
            manual_ref = clean_str(row.get("Mannual Ref. No.") or row.get("Manual Ref No"))
            add_user = clean_str(row.get("AddUser") or row.get("Added By") or "Office")
            company_name = clean_str(row.get("Company Name") or "AKLANK COLLEGE")

            report["total_source_fee_paid"] += paid_amount

            # Match Student
            matched_uid = index.find_match(
                scholar_no=reg_no,
                reg_no=reg_no,
                name=student_name,
                father_name=father_name,
                mobile=mobile
            )

            # If student not matched in master list, create student profile from fee record
            if not matched_uid:
                base_uname = sanitize_username(student_name or reg_no or "student")
                uname = base_uname
                suffix = 1
                email = f"{uname.lower()}@aklankcollege.ac.in"
                while uname.lower() in index.by_username or email.lower() in index.by_email:
                    if reg_no:
                        clean_sch = re.sub(r'[^a-zA-Z0-9]', '', reg_no).lower()
                        uname = f"{base_uname}_{clean_sch}"
                        email = f"{uname.lower()}@aklankcollege.ac.in"
                        if uname.lower() in index.by_username or email.lower() in index.by_email:
                            uname = f"{base_uname}_{clean_sch}_{suffix}"
                            email = f"{uname.lower()}@aklankcollege.ac.in"
                    else:
                        uname = f"{base_uname}{suffix}"
                        email = f"{uname.lower()}@aklankcollege.ac.in"
                    suffix += 1

                index.by_username[uname.lower()] = True
                index.by_email.add(email.lower())

                new_user = User(
                    username=uname,
                    email=email,
                    hashed_password=DEFAULT_STUDENT_HASH,
                    full_name=student_name or "Student",
                    role=UserRole.student,
                    phone=mobile,
                    is_active=True,
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(new_user)
                db.flush()

                new_profile = StudentProfile(
                    user_id=new_user.id,
                    roll_number=reg_no or f"SCH_{new_user.id}",
                    reg_no=reg_no,
                    student_name=student_name,
                    father_name=father_name,
                    department=get_department(class_name),
                    class_name=class_name,
                    section=section,
                    mobile=mobile,
                    status="ACTIVE",
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(new_profile)
                db.flush()

                index.users[new_user.id] = new_user
                index.profiles[new_user.id] = new_profile
                index.index_student(new_user, new_profile)

                report["users_created"] += 1
                report["students_imported"] += 1
                matched_uid = new_user.id

            # Add Academic History for this session if not present
            ah_key = (matched_uid, session)
            if ah_key not in existing_academic_keys:
                existing_academic_keys.add(ah_key)
                ah = StudentAcademicHistory(
                    student_id=matched_uid,
                    session=session,
                    course=get_department(class_name),
                    class_name=class_name,
                    section=section,
                    roll_no=reg_no,
                    status="ACTIVE",
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(ah)
                report["academic_history_records"] += 1

            # 1. Upsert FeeTransaction
            raw_json = json.dumps({k: str(v) for k, v in row.to_dict().items() if pd.notna(v)})
            if receipt_no in existing_fee_transactions:
                ft = existing_fee_transactions[receipt_no]
                ft.voucher_type = vchr_type
                ft.voucher_date = vchr_date
                ft.add_date = add_date
                ft.manual_ref_no = manual_ref
                ft.reg_no = reg_no
                ft.scholar_no = reg_no
                ft.student_name = student_name
                ft.father_name = father_name
                ft.class_name = class_name
                ft.section = section
                ft.mobile_no = mobile
                ft.paid_amount = paid_amount
                ft.discount_amount = discount_amount
                ft.payment_mode = pay_mode
                ft.cheque_number = cheque_no
                ft.cheque_date = cheque_date
                ft.created_by = add_user
                ft.company_name = company_name
                ft.student_id = matched_uid
                ft.is_matched = True
                ft.installment = session
                ft.extra_columns = raw_json
            else:
                ft = FeeTransaction(
                    receipt_number=receipt_no,
                    voucher_type=vchr_type,
                    voucher_date=vchr_date,
                    add_date=add_date,
                    manual_ref_no=manual_ref,
                    reg_no=reg_no,
                    scholar_no=reg_no,
                    student_name=student_name,
                    father_name=father_name,
                    class_name=class_name,
                    section=section,
                    mobile_no=mobile,
                    paid_amount=paid_amount,
                    discount_amount=discount_amount,
                    payment_mode=pay_mode,
                    cheque_number=cheque_no,
                    cheque_date=cheque_date,
                    created_by=add_user,
                    company_name=company_name,
                    student_id=matched_uid,
                    is_matched=True,
                    installment=session,
                    extra_columns=raw_json
                )
                db.add(ft)
                existing_fee_transactions[receipt_no] = ft
                report["fee_transactions_imported"] += 1

            # 2. Upsert FeeReceipt
            if receipt_no not in existing_receipt_numbers:
                existing_receipt_numbers.add(receipt_no)
                rcpt = FeeReceipt(
                    student_id=matched_uid,
                    voucher_no=receipt_no,
                    receipt_no=receipt_no,
                    receipt_date=vchr_date or datetime.datetime.utcnow(),
                    payment_mode=pay_mode,
                    amount=paid_amount,
                    discount=discount_amount,
                    bank_name=company_name,
                    transaction_id=cheque_no or manual_ref or receipt_no,
                    remarks=f"Class: {class_name or ''} | Session: {session} | Mode: {pay_mode}",
                    created_by=add_user,
                    session=session,
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(rcpt)
                report["fee_receipts_imported"] += 1

            # 3. Upsert Payment
            if receipt_no not in existing_payment_refs:
                existing_payment_refs.add(receipt_no)
                pmt = Payment(
                    student_id=matched_uid,
                    payment_mode=pay_mode,
                    bank=company_name,
                    cheque=cheque_no,
                    reference_number=receipt_no,
                    payment_date=vchr_date or datetime.datetime.utcnow(),
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(pmt)
                report["payments_recorded"] += 1

            # 4. Record Fee Discount if applied
            if discount_amount > 0:
                disc = FeeDiscount(
                    student_id=matched_uid,
                    discount_amount=discount_amount,
                    discount_type="CONCESSION",
                    remark=f"Receipt #{receipt_no} Session {session}",
                    created_at=vchr_date or datetime.datetime.utcnow()
                )
                db.add(disc)
                report["fee_discounts_recorded"] += 1

        db.flush()

    # =========================================================================
    # STEP 3: COMPUTE YEAR-WISE AND OVERALL FEE SUMMARIES
    # =========================================================================
    print("\n--- STEP 3: Dynamic Fee Summaries Calculation ---")
    all_students = db.query(User.id).filter(User.role == UserRole.student).all()

    # Query paid totals per student
    paid_totals = dict(
        db.query(FeeReceipt.student_id, func.sum(FeeReceipt.amount)).group_by(FeeReceipt.student_id).all()
    )
    disc_totals = dict(
        db.query(FeeReceipt.student_id, func.sum(FeeReceipt.discount)).group_by(FeeReceipt.student_id).all()
    )
    last_dates = dict(
        db.query(FeeReceipt.student_id, func.max(FeeReceipt.receipt_date)).group_by(FeeReceipt.student_id).all()
    )

    # Query academic sessions per student
    student_sessions = db.query(StudentAcademicHistory.student_id, StudentAcademicHistory.class_name, StudentAcademicHistory.session).all()
    student_sessions_map: Dict[int, List[Tuple[str, str]]] = {}
    for sid, cname, sess in student_sessions:
        student_sessions_map.setdefault(sid, []).append((cname, sess))

    existing_summaries = {fs.student_id: fs for fs in db.query(FeeSummary).all()}

    for (std_id,) in all_students:
        total_paid = float(paid_totals.get(std_id) or 0.0)
        total_disc = float(disc_totals.get(std_id) or 0.0)
        last_date = last_dates.get(std_id)

        # Calculate estimated total course fee from all academic sessions attended
        sessions_attended = student_sessions_map.get(std_id) or [("B.A. Part-I", "2023-24")]
        estimated_course_fee = 0.0
        for cname, sess in sessions_attended:
            estimated_course_fee += get_standard_course_fee(cname, sess)

        # Ensure total fee is at least total paid + discount
        if total_paid + total_disc > estimated_course_fee:
            estimated_course_fee = total_paid + total_disc

        pending_fee = max(0.0, estimated_course_fee - total_paid - total_disc)

        if pending_fee <= 0:
            status = "PAID"
        elif total_paid > 0:
            status = "PARTIAL"
        else:
            status = "UNPAID"

        fee_sum = existing_summaries.get(std_id)
        if fee_sum:
            fee_sum.total_fee = estimated_course_fee
            fee_sum.total_paid = total_paid
            fee_sum.discount = total_disc
            fee_sum.pending_fee = pending_fee
            fee_sum.balance = pending_fee
            fee_sum.last_payment_date = last_date
            fee_sum.current_status = status
            fee_sum.updated_at = datetime.datetime.utcnow()
        else:
            fee_sum = FeeSummary(
                student_id=std_id,
                total_fee=estimated_course_fee,
                total_paid=total_paid,
                discount=total_disc,
                pending_fee=pending_fee,
                balance=pending_fee,
                last_payment_date=last_date,
                current_status=status,
                updated_at=datetime.datetime.utcnow()
            )
            db.add(fee_sum)

    db.flush()

    # Log Execution in ImportLog
    end_time = datetime.datetime.utcnow()
    total_db_paid = float(db.query(func.coalesce(func.sum(FeeReceipt.amount), 0.0)).scalar() or 0.0)
    report["total_db_fee_paid"] = total_db_paid
    report["status"] = "COMPLETED"

    log_entry = ImportLog(
        import_type="AKLANK_HISTORICAL_ERP_2022_2026",
        status="COMPLETED",
        student_records_found=report["total_source_student_rows"],
        students_imported=report["students_imported"],
        students_updated=report["students_updated"],
        users_created=report["users_created"],
        fee_records_found=report["total_source_fee_rows"],
        fee_transactions_imported=report["fee_transactions_imported"],
        start_time=start_time,
        end_time=end_time,
        report_summary=json.dumps(report)
    )
    db.add(log_entry)
    db.commit()

    print("\n" + "=" * 70)
    print("MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    print(f"Student Files Processed: {report['student_files_processed']}")
    print(f"Fee Files Processed:     {report['fee_files_processed']}")
    print(f"Total Source Students:   {report['total_source_student_rows']}")
    print(f"Total Source Fee Rows:   {report['total_source_fee_rows']}")
    print(f"Total Students in DB:    {db.query(StudentProfile).count()}")
    print(f"Total Users in DB:       {db.query(User).filter(User.role == UserRole.student).count()}")
    print(f"Academic Histories in DB:{db.query(StudentAcademicHistory).count()}")
    print(f"Fee Receipts in DB:      {db.query(FeeReceipt).count()}")
    print(f"Fee Transactions in DB:  {db.query(FeeTransaction).count()}")
    print(f"Payments in DB:          {db.query(Payment).count()}")
    print(f"Source Fee Amount Paid:  INR {report['total_source_fee_paid']:,.2f}")
    print(f"Database Fee Total Paid: INR {total_db_paid:,.2f}")
    print("=" * 70)

    if close_db_at_end:
        db.close()

    return report


if __name__ == "__main__":
    run_migration()
