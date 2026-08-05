import os
import re
import csv
import json
import datetime
import openpyxl
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.fee import (
    FeeTransaction, FeeInstallment, FeeDiscount, UnmatchedFeeRecord, ImportLog, FeeStatus
)
from app.utils.password_handler import hash_password


def sanitize_username(name: str) -> str:
    """Convert Student Name to lowercase, remove spaces and special characters."""
    if not name:
        return "student"
    # Remove special characters and spaces
    clean = re.sub(r'[^a-zA-Z0-9]', '', str(name)).lower()
    return clean if clean else "student"


def parse_date(val: Any) -> Any:
    if not val:
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.date() if isinstance(val, datetime.datetime) else val
    val_str = str(val).strip()
    # Try various date formats
    for fmt in (
        "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y",
        "%d-%m-%Y %I:%M %p", "%d/%m/%Y %I:%M %p", "%Y-%m-%d %H:%M:%S"
    ):
        try:
            dt = datetime.datetime.strptime(val_str, fmt)
            return dt.date() if " " not in fmt else dt
        except ValueError:
            pass
    return None


def parse_datetime(val: Any) -> Any:
    if not val:
        return None
    if isinstance(val, datetime.datetime):
        return val
    if isinstance(val, datetime.date):
        return datetime.datetime.combine(val, datetime.time.min)
    val_str = str(val).strip()
    for fmt in (
        "%d-%m-%Y %I:%M %p", "%d-%m-%Y %H:%M:%S", "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %I:%M %p", "%d/%m/%Y"
    ):
        try:
            return datetime.datetime.strptime(val_str, fmt)
        except ValueError:
            pass
    return None


def clean_str(val: Any) -> Any:
    if val is None:
        return None
    s = str(val).strip()
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
    return s if s else None


def clean_float(val: Any) -> float:
    if val is None or str(val).strip() == '':
        return 0.0
    try:
        # Remove commas
        clean_v = str(val).replace(',', '').strip()
        return float(clean_v)
    except (ValueError, TypeError):
        return 0.0


def get_department(class_name: str) -> str:
    if not class_name:
        return "General"
    c_upper = class_name.upper()
    if "B.A" in c_upper or "ARTS" in c_upper or "DRAWING" in c_upper:
        return "Arts"
    elif "B.C.A" in c_upper or "BCA" in c_upper or "COMPUTER" in c_upper:
        return "Computer Applications"
    elif "B.COM" in c_upper or "COMMERCE" in c_upper:
        return "Commerce"
    elif "B.SC" in c_upper or "SCIENCE" in c_upper:
        return "Science"
    elif "M.A" in c_upper:
        return "Post Graduate Arts"
    return "General"


def run_full_import(
    db: Session,
    excel_path: str = r"C:\Users\iSN_kota_T52\Downloads\AKLANK COLLEGE (1).xlsx",
    csv_path: str = r"C:\Users\iSN_kota_T52\Downloads\aklank college fees 2023-24.csv"
) -> Dict[str, Any]:
    """
    Executes full import safely in a database transaction:
    1. Reads AKLANK COLLEGE (1).xlsx student master file.
    2. Reads aklank college fees 2023-24.csv fee file.
    3. Handles username generation & deduplication.
    4. Handles student master upsert.
    5. Handles fee receipt deduplication & unmatched fee tracking.
    6. Returns structured report dict & logs to import_logs table.
    """
    start_time = datetime.datetime.utcnow()

    report = {
        "student_records_found": 0,
        "students_imported": 0,
        "students_updated": 0,
        "users_created": 0,
        "duplicate_usernames_fixed": 0,
        "fee_records_found": 0,
        "fee_transactions_imported": 0,
        "fee_transactions_updated": 0,
        "duplicate_receipts_updated": 0,
        "unmatched_fee_records": 0,
        "failed_records": 0,
        "errors": [],
        "start_time": start_time.isoformat(),
        "end_time": None
    }

    try:
        # Map of existing usernames in DB
        existing_usernames = {
            u.username: u.id for u in db.query(User.id, User.username).filter(User.username.isnot(None)).all()
        }

        # Map of students by scholar_no and reg_no
        student_by_scholar: Dict[str, Tuple[int, StudentProfile]] = {}
        student_by_reg: Dict[str, Tuple[int, StudentProfile]] = {}

        profiles = db.query(StudentProfile).all()
        for p in profiles:
            if p.roll_number:
                student_by_scholar[p.roll_number.strip().upper()] = (p.user_id, p)
            if p.reg_no:
                student_by_reg[p.reg_no.strip().upper()] = (p.user_id, p)

        # ========================================================
        # STEP 1: IMPORT STUDENT MASTER FILE (Excel)
        # ========================================================
        if os.path.exists(excel_path):
            wb = openpyxl.load_workbook(excel_path, data_only=True)
            for sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
                if sheet.max_row < 2:
                    continue

                headers = [clean_str(sheet.cell(2, col).value) for col in range(1, sheet.max_column + 1)]
                header_map = {h: idx + 1 for idx, h in enumerate(headers) if h}

                for row_idx in range(3, sheet.max_row + 1):
                    # Check if row is empty
                    raw_row_vals = [sheet.cell(row_idx, col).value for col in range(1, sheet.max_column + 1)]
                    if not any(raw_row_vals):
                        continue

                    scholar_no = clean_str(sheet.cell(row_idx, header_map.get("Scholar No.")).value) if header_map.get("Scholar No.") else None
                    reg_no = clean_str(sheet.cell(row_idx, header_map.get("Pre Registration No")).value) if header_map.get("Pre Registration No") else None
                    name = clean_str(sheet.cell(row_idx, header_map.get("Name")).value) if header_map.get("Name") else None

                    if not scholar_no and not reg_no and not name:
                        continue

                    report["student_records_found"] += 1

                    unique_key = (scholar_no or reg_no or "").strip().upper()
                    father_name = clean_str(sheet.cell(row_idx, header_map.get("Father Name")).value) if header_map.get("Father Name") else None
                    mother_name = clean_str(sheet.cell(row_idx, header_map.get("Mother Name")).value) if header_map.get("Mother Name") else None
                    class_name = clean_str(sheet.cell(row_idx, header_map.get("Class")).value) if header_map.get("Class") else None
                    section = clean_str(sheet.cell(row_idx, header_map.get("Sec.")).value) if header_map.get("Sec.") else None
                    dob = parse_date(sheet.cell(row_idx, header_map.get("DOB")).value) if header_map.get("DOB") else None
                    gender = clean_str(sheet.cell(row_idx, header_map.get("Gender")).value) if header_map.get("Gender") else None
                    category = clean_str(sheet.cell(row_idx, header_map.get("Category")).value) if header_map.get("Category") else None
                    student_type = clean_str(sheet.cell(row_idx, header_map.get("Student Type")).value) if header_map.get("Student Type") else None
                    sms_mobile = clean_str(sheet.cell(row_idx, header_map.get("SMS Mobile")).value) if header_map.get("SMS Mobile") else None
                    father_mobile = clean_str(sheet.cell(row_idx, header_map.get("Father Mobile")).value) if header_map.get("Father Mobile") else None
                    mother_phone = clean_str(sheet.cell(row_idx, header_map.get("Mother Phone")).value) if header_map.get("Mother Phone") else None
                    mother_mobile = clean_str(sheet.cell(row_idx, header_map.get("Mother Mobile")).value) if header_map.get("Mother Mobile") else None
                    reg_date = parse_date(sheet.cell(row_idx, header_map.get("Reg. Date")).value) if header_map.get("Reg. Date") else None
                    reg_class = clean_str(sheet.cell(row_idx, header_map.get("Reg. Class")).value) if header_map.get("Reg. Class") else None
                    religion = clean_str(sheet.cell(row_idx, header_map.get("Religion")).value) if header_map.get("Religion") else None
                    corr_address = clean_str(sheet.cell(row_idx, header_map.get("Correspondance Address")).value) if header_map.get("Correspondance Address") else None
                    perm_address = clean_str(sheet.cell(row_idx, header_map.get("Permanent Address")).value) if header_map.get("Permanent Address") else None
                    blood_group = clean_str(sheet.cell(row_idx, header_map.get("Student Blood Group")).value) if header_map.get("Student Blood Group") else None
                    allergies = clean_str(sheet.cell(row_idx, header_map.get("Allergies")).value) if header_map.get("Allergies") else None
                    pre_school_name = clean_str(sheet.cell(row_idx, header_map.get("Pre School Name")).value) if header_map.get("Pre School Name") else None
                    board_roll_12 = clean_str(sheet.cell(row_idx, header_map.get("12 Board RollNo")).value) if header_map.get("12 Board RollNo") else None
                    board_roll_10 = clean_str(sheet.cell(row_idx, header_map.get("10 Board RollNo")).value) if header_map.get("10 Board RollNo") else None
                    minority_val = sheet.cell(row_idx, header_map.get("Minority")).value if header_map.get("Minority") else None
                    try:
                        minority = int(minority_val) if minority_val is not None else 0
                    except (ValueError, TypeError):
                        minority = 0
                    janaadhar_no = clean_str(sheet.cell(row_idx, header_map.get("Janaadhar No.")).value) if header_map.get("Janaadhar No.") else None
                    perm_area = clean_str(sheet.cell(row_idx, header_map.get("Permanent Area")).value) if header_map.get("Permanent Area") else None
                    exist_status = clean_str(sheet.cell(row_idx, header_map.get("Exist Status")).value) if header_map.get("Exist Status") else None
                    discount_remark = clean_str(sheet.cell(row_idx, header_map.get("Discount Remark")).value) if header_map.get("Discount Remark") else None

                    # Pack remaining fields into JSON
                    extra_data = {}
                    for col_h, col_i in header_map.items():
                        if col_h not in [
                            "Scholar No.", "Pre Registration No", "Name", "Father Name", "Mother Name",
                            "Class", "Sec.", "DOB", "Gender", "Category", "Student Type", "SMS Mobile",
                            "Father Mobile", "Mother Phone", "Mother Mobile", "Reg. Date", "Reg. Class",
                            "Religion", "Correspondance Address", "Permanent Address", "Student Blood Group",
                            "Allergies", "Pre School Name", "12 Board RollNo", "10 Board RollNo", "Minority",
                            "Janaadhar No.", "Permanent Area", "Exist Status", "Discount Remark"
                        ]:
                            val = sheet.cell(row_idx, col_i).value
                            if val is not None:
                                extra_data[col_h] = str(val)

                    extra_json = json.dumps(extra_data) if extra_data else None
                    department = get_department(class_name)

                    # Check if student exists
                    existing_entry = student_by_scholar.get(unique_key) or (student_by_reg.get(unique_key) if reg_no else None)

                    if existing_entry:
                        user_id, profile = existing_entry
                        # Update user full_name and phone
                        user = db.query(User).filter(User.id == user_id).first()
                        if user:
                            if name:
                                user.full_name = name
                            if sms_mobile or father_mobile:
                                user.phone = sms_mobile or father_mobile

                        # Update profile
                        if scholar_no:
                            profile.roll_number = scholar_no
                        if reg_no:
                            profile.reg_no = reg_no
                        profile.department = department
                        profile.class_name = class_name
                        profile.section = section
                        profile.date_of_birth = dob
                        profile.address = corr_address
                        profile.father_name = father_name
                        profile.mother_name = mother_name
                        profile.gender = gender
                        profile.category = category
                        profile.student_type = student_type
                        profile.reg_date = reg_date
                        profile.reg_class = reg_class
                        profile.religion = religion
                        profile.father_mobile = father_mobile
                        profile.mother_phone = mother_phone
                        profile.mother_mobile = mother_mobile
                        profile.permanent_address = perm_address
                        profile.exist_status = exist_status
                        profile.minority = minority
                        profile.permanent_area = perm_area
                        profile.discount_remark = discount_remark
                        profile.janaadhar_no = janaadhar_no
                        profile.blood_group = blood_group
                        profile.allergies = allergies
                        profile.pre_school_name = pre_school_name
                        profile.board_roll_no_12 = board_roll_12
                        profile.board_roll_no_10 = board_roll_10
                        if extra_json:
                            profile.extra_fields = extra_json

                        report["students_updated"] += 1
                    else:
                        # CREATE USER
                        base_username = sanitize_username(name or scholar_no or "student")
                        username = base_username
                        suffix = 1
                        while username in existing_usernames:
                            username = f"{base_username}{suffix}"
                            suffix += 1
                            report["duplicate_usernames_fixed"] += 1

                        existing_usernames[username] = True

                        raw_password = sms_mobile or father_mobile or scholar_no or "password123"
                        hashed_pw = hash_password(str(raw_password))
                        email = f"{username}@aklankcollege.ac.in"

                        user = User(
                            username=username,
                            email=email,
                            hashed_password=hashed_pw,
                            full_name=name or "Student",
                            role=UserRole.student,
                            phone=sms_mobile or father_mobile,
                            is_active=True,
                            created_at=datetime.datetime.utcnow()
                        )
                        db.add(user)
                        db.flush()
                        report["users_created"] += 1

                        profile = StudentProfile(
                            user_id=user.id,
                            roll_number=scholar_no or unique_key,
                            reg_no=reg_no,
                            department=department,
                            class_name=class_name,
                            section=section,
                            date_of_birth=dob,
                            address=corr_address,
                            father_name=father_name,
                            mother_name=mother_name,
                            gender=gender,
                            category=category,
                            student_type=student_type,
                            reg_date=reg_date,
                            reg_class=reg_class,
                            religion=religion,
                            father_mobile=father_mobile,
                            mother_phone=mother_phone,
                            mother_mobile=mother_mobile,
                            permanent_address=perm_address,
                            exist_status=exist_status,
                            minority=minority,
                            permanent_area=perm_area,
                            discount_remark=discount_remark,
                            janaadhar_no=janaadhar_no,
                            blood_group=blood_group,
                            allergies=allergies,
                            pre_school_name=pre_school_name,
                            board_roll_no_12=board_roll_12,
                            board_roll_no_10=board_roll_10,
                            extra_fields=extra_json
                        )
                        db.add(profile)
                        db.flush()

                        if scholar_no:
                            student_by_scholar[scholar_no.strip().upper()] = (user.id, profile)
                        if reg_no:
                            student_by_reg[reg_no.strip().upper()] = (user.id, profile)

                        report["students_imported"] += 1

        db.flush()

        # Re-query all student mappings to ensure fee matching works 100%
        student_id_map: Dict[str, int] = {}
        for sp in db.query(StudentProfile).all():
            if sp.roll_number:
                student_id_map[sp.roll_number.strip().upper()] = sp.user_id
            if sp.reg_no:
                student_id_map[sp.reg_no.strip().upper()] = sp.user_id

        # Existing Fee Transactions map by receipt_number
        existing_receipts = {
            ft.receipt_number: ft for ft in db.query(FeeTransaction).all()
        }

        # ========================================================
        # STEP 2: IMPORT FEE DETAILS FILE (CSV)
        # ========================================================
        if os.path.exists(csv_path):
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    report["fee_records_found"] += 1

                    vchr_no = clean_str(row.get("Vchr. No"))
                    if not vchr_no:
                        report["failed_records"] += 1
                        continue

                    receipt_number = str(vchr_no)
                    reg_no_csv = clean_str(row.get("Reg No"))
                    student_name = clean_str(row.get("Name"))
                    father_name = clean_str(row.get("Father Name"))
                    class_name = clean_str(row.get("Class"))
                    section = clean_str(row.get("Section"))
                    mobile_no = clean_str(row.get("MobileNo"))
                    vchr_type = clean_str(row.get("Vchr. Type"))
                    vchr_date = parse_datetime(row.get("Vchr. Date"))
                    add_date = parse_datetime(row.get("Add Date"))
                    manual_ref = clean_str(row.get("Mannual Ref. No."))
                    paid_amount = clean_float(row.get("Paid Amount"))
                    refund_amount = clean_float(row.get("Refund Amount"))
                    discount_amount = clean_float(row.get("Less Amount"))
                    pay_mode = clean_str(row.get("Pay Mode"))
                    bank_name = clean_str(row.get("Bank"))
                    cheque_no = clean_str(row.get("Cheque No"))
                    cheque_date = parse_datetime(row.get("Cheque Date"))
                    add_user = clean_str(row.get("AddUser"))
                    cancelled_status = clean_str(row.get("Cancelled Status")) or "N"
                    cancelled_amount = clean_float(row.get("Cancelled Amount"))
                    remark = clean_str(row.get("Remark"))
                    company_name = clean_str(row.get("Company Name"))

                    # Store remaining columns in extra_columns JSON
                    extra_cols = {
                        k: v for k, v in row.items() if k not in [
                            "Vchr. No", "Reg No", "Name", "Father Name", "Class", "Section", "MobileNo",
                            "Vchr. Type", "Vchr. Date", "Add Date", "Mannual Ref. No.", "Paid Amount",
                            "Refund Amount", "Less Amount", "Pay Mode", "Bank", "Cheque No", "Cheque Date",
                            "AddUser", "Cancelled Status", "Cancelled Amount", "Remark", "Company Name"
                        ]
                    }
                    extra_json = json.dumps(extra_cols) if extra_cols else None

                    # Match student
                    matched_user_id = None
                    if reg_no_csv:
                        matched_user_id = student_id_map.get(reg_no_csv.strip().upper())

                    is_matched = matched_user_id is not None

                    if not is_matched:
                        report["unmatched_fee_records"] += 1
                        # Create Unmatched Fee Record entry
                        unmatched = db.query(UnmatchedFeeRecord).filter(
                            UnmatchedFeeRecord.receipt_number == receipt_number
                        ).first()
                        if not unmatched:
                            unmatched = UnmatchedFeeRecord(
                                receipt_number=receipt_number,
                                reg_no=reg_no_csv,
                                student_name=student_name,
                                class_name=class_name,
                                paid_amount=paid_amount,
                                payment_mode=pay_mode,
                                raw_data=json.dumps(row)
                            )
                            db.add(unmatched)

                    # Deduplicate / Upsert FeeTransaction
                    if receipt_number in existing_receipts:
                        ft = existing_receipts[receipt_number]
                        ft.voucher_type = vchr_type
                        ft.voucher_date = vchr_date
                        ft.add_date = add_date
                        ft.manual_ref_no = manual_ref
                        ft.reg_no = reg_no_csv
                        ft.student_name = student_name
                        ft.father_name = father_name
                        ft.class_name = class_name
                        ft.section = section
                        ft.mobile_no = mobile_no
                        ft.paid_amount = paid_amount
                        ft.discount_amount = discount_amount
                        ft.refund_amount = refund_amount
                        ft.payment_mode = pay_mode
                        ft.bank_name = bank_name
                        ft.cheque_number = cheque_no
                        ft.cheque_date = cheque_date
                        ft.remarks = remark
                        ft.cancelled_status = cancelled_status
                        ft.cancelled_amount = cancelled_amount
                        ft.created_by = add_user
                        ft.company_name = company_name
                        if matched_user_id:
                            ft.student_id = matched_user_id
                            ft.is_matched = True
                        ft.extra_columns = extra_json

                        report["fee_transactions_updated"] += 1
                        report["duplicate_receipts_updated"] += 1
                    else:
                        ft = FeeTransaction(
                            receipt_number=receipt_number,
                            voucher_type=vchr_type,
                            voucher_date=vchr_date,
                            add_date=add_date,
                            manual_ref_no=manual_ref,
                            reg_no=reg_no_csv,
                            scholar_no=reg_no_csv,
                            student_name=student_name,
                            father_name=father_name,
                            class_name=class_name,
                            section=section,
                            mobile_no=mobile_no,
                            paid_amount=paid_amount,
                            discount_amount=discount_amount,
                            refund_amount=refund_amount,
                            payment_mode=pay_mode,
                            bank_name=bank_name,
                            cheque_number=cheque_no,
                            cheque_date=cheque_date,
                            remarks=remark,
                            cancelled_status=cancelled_status,
                            cancelled_amount=cancelled_amount,
                            created_by=add_user,
                            company_name=company_name,
                            student_id=matched_user_id,
                            is_matched=is_matched,
                            extra_columns=extra_json
                        )
                        db.add(ft)
                        existing_receipts[receipt_number] = ft
                        report["fee_transactions_imported"] += 1

                    # Discount tracking
                    if matched_user_id and discount_amount > 0:
                        disc = FeeDiscount(
                            student_id=matched_user_id,
                            discount_amount=discount_amount,
                            discount_type="SCHOLARSHIP_OR_LESS",
                            remark=remark or f"Receipt #{receipt_number}"
                        )
                        db.add(disc)

        end_time = datetime.datetime.utcnow()
        report["end_time"] = end_time.isoformat()

        # Record in ImportLog
        log_entry = ImportLog(
            import_type="AKLANK_MASTER_AND_FEES",
            status="COMPLETED",
            student_records_found=report["student_records_found"],
            students_imported=report["students_imported"],
            students_updated=report["students_updated"],
            users_created=report["users_created"],
            duplicate_usernames_fixed=report["duplicate_usernames_fixed"],
            fee_records_found=report["fee_records_found"],
            fee_transactions_imported=report["fee_transactions_imported"],
            fee_transactions_updated=report["fee_transactions_updated"],
            duplicate_receipts_updated=report["duplicate_receipts_updated"],
            unmatched_fee_records=report["unmatched_fee_records"],
            failed_records=report["failed_records"],
            start_time=start_time,
            end_time=end_time,
            report_summary=json.dumps(report)
        )
        db.add(log_entry)
        db.commit()

        return report

    except Exception as exc:
        db.rollback()
        end_time = datetime.datetime.utcnow()
        report["end_time"] = end_time.isoformat()
        report["errors"].append(str(exc))
        report["status"] = "FAILED"
        return report
