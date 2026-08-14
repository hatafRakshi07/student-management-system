from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
import uuid

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.parent import ParentProfile, ParentStudentMapping, RelationshipType
from app.models.library import LibraryMemberRecord, MemberType
from app.models.fee import FeeSummary
from app.models.subject import Subject
from app.models.enterprise import (
    LMSCourseContent, LMSQuiz, LMSQuizQuestion, LMSAssignmentSubmission, LMSStudentProgress,
    AdmissionApplication, AdmissionDocument, AdmissionMeritList,
    LedgerAccount, JournalEntry, JournalLineItem, FinancialTransaction,
    CollegeAccount, CollegeExpense,
    ContentType, AdmissionStatus, AccountType, VoucherType
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user
from app.utils.password_handler import hash_password

router = APIRouter(prefix="/api", tags=["Enterprise LMS, Admission & Finance ERP"])


def seed_enterprise_defaults(db: Session):
    """Seed initial LMS content, Chart of Accounts, College Accounts and Expenses if empty."""
    if db.query(LedgerAccount).count() == 0:
        accounts = [
            LedgerAccount(account_code="1001", account_name="Cash in Hand", account_type=AccountType.ASSET, opening_balance=45000.0, current_balance=45000.0),
            LedgerAccount(account_code="1002", account_name="SBI Main Operating Account", account_type=AccountType.ASSET, opening_balance=1250000.0, current_balance=1250000.0),
            LedgerAccount(account_code="1003", account_name="HDFC Development Fund Account", account_type=AccountType.ASSET, opening_balance=800000.0, current_balance=800000.0),
            LedgerAccount(account_code="3001", account_name="Student Tuition Fee Revenue", account_type=AccountType.INCOME, opening_balance=0.0, current_balance=0.0),
            LedgerAccount(account_code="4001", account_name="Faculty & Staff Salary Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=485000.0),
            LedgerAccount(account_code="4002", account_name="Electricity & Water Utilities Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=38500.0),
            LedgerAccount(account_code="4003", account_name="Campus Infrastructure & Repairs Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=65000.0),
            LedgerAccount(account_code="4004", account_name="IT Infrastructure & Software Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=18500.0),
            LedgerAccount(account_code="4005", account_name="Library Books & Subscriptions Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=24000.0),
            LedgerAccount(account_code="4006", account_name="Lab Equipment & Chemicals Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=120000.0),
            LedgerAccount(account_code="4007", account_name="Campus Events & Sports Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=14200.0),
            LedgerAccount(account_code="4008", account_name="Printing & Admin Stationery Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=16800.0),
            LedgerAccount(account_code="4009", account_name="Transport & Fuel Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=28600.0),
        ]
        db.add_all(accounts)
        db.commit()

    if db.query(CollegeAccount).count() == 0:
        c_accounts = [
            CollegeAccount(
                account_name="SBI Main Operating Account",
                account_number="38920194812",
                bank_name="State Bank of India",
                branch_name="Main Campus Branch",
                ifsc_code="SBIN0004812",
                account_type="CURRENT",
                current_balance=1250000.0,
                is_active=True
            ),
            CollegeAccount(
                account_name="HDFC Development Fund Account",
                account_number="5010029381928",
                bank_name="HDFC Bank",
                branch_name="City Centre Branch",
                ifsc_code="HDFC0000182",
                account_type="SAVINGS",
                current_balance=800000.0,
                is_active=True
            ),
            CollegeAccount(
                account_name="Campus Petty Cash Counter",
                account_number="CASH-CAMPUS-01",
                bank_name="Cash Box",
                branch_name="Main Admin Office",
                ifsc_code="N/A",
                account_type="PETTY_CASH",
                current_balance=45000.0,
                is_active=True
            )
        ]
        db.add_all(c_accounts)
        db.commit()

    if db.query(CollegeExpense).count() == 0:
        sbi_acc = db.query(CollegeAccount).filter(CollegeAccount.account_number == "38920194812").first()
        hdfc_acc = db.query(CollegeAccount).filter(CollegeAccount.account_number == "5010029381928").first()
        cash_acc = db.query(CollegeAccount).filter(CollegeAccount.account_number == "CASH-CAMPUS-01").first()

        sample_expenses = [
            CollegeExpense(
                voucher_no="EXP-2026-001",
                title="Faculty & Staff Monthly Payroll (July 2026)",
                category="Salary of Staff",
                amount=485000.0,
                expense_date=date(2026, 7, 31),
                payment_mode="ONLINE_TRANSFER",
                reference_no="UTR993821048",
                payee_name="Aklank College Staff & Faculty Payroll Account",
                description="Disbursement of July month salaries for 45 full-time faculty & administrative staff members",
                status="PAID",
                college_account_id=sbi_acc.id if sbi_acc else None,
                created_by="System Admin"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-002",
                title="State Electricity Board Main Meter Bill",
                category="Electricity & Utilities",
                amount=38500.0,
                expense_date=date(2026, 8, 5),
                payment_mode="ONLINE_TRANSFER",
                reference_no="EB-90182371",
                payee_name="JVVNL Power Corporation Ltd",
                description="Monthly electrical tariff payment for Academic Block A, B & Central Library",
                status="PAID",
                college_account_id=hdfc_acc.id if hdfc_acc else None,
                created_by="Finance Officer"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-003",
                title="Dell OptiPlex Desktops for Computer Science Lab",
                category="Lab Equipment",
                amount=120000.0,
                expense_date=date(2026, 8, 1),
                payment_mode="CHEQUE",
                reference_no="CHQ-778219",
                payee_name="Dell India Pvt Ltd",
                description="Procurement of 3 high-performance desktop systems for Advanced CS Lab",
                status="PAID",
                college_account_id=sbi_acc.id if sbi_acc else None,
                created_by="IT Admin"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-004",
                title="High-Speed Leased Line Internet (Q3 Subscription)",
                category="IT & Software",
                amount=18500.0,
                expense_date=date(2026, 8, 8),
                payment_mode="UPI",
                reference_no="UPI-88129038",
                payee_name="Airtel Business Enterprise Services",
                description="Quarterly 500 Mbps dedicated fiber internet subscription for entire campus",
                status="PAID",
                college_account_id=sbi_acc.id if sbi_acc else None,
                created_by="IT Admin"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-005",
                title="Library Science & Engineering Journal Subscriptions",
                category="Library Books",
                amount=24000.0,
                expense_date=date(2026, 8, 2),
                payment_mode="ONLINE_TRANSFER",
                reference_no="NEFT-5519203",
                payee_name="Oxford University Press & IEEE Digital",
                description="Annual digital journal licenses and physical book prints for Central Library",
                status="PAID",
                college_account_id=sbi_acc.id if sbi_acc else None,
                created_by="Librarian"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-006",
                title="Annual Main Building Waterproofing & Maintenance",
                category="Maintenance",
                amount=65000.0,
                expense_date=date(2026, 7, 28),
                payment_mode="CHEQUE",
                reference_no="CHQ-778215",
                payee_name="Shivam Infrastructure Ltd",
                description="Monsoon proofing and exterior wall repairs for Main Academic Block",
                status="PAID",
                college_account_id=hdfc_acc.id if hdfc_acc else None,
                created_by="Estate Manager"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-007",
                title="Annual Sports Meet Equipment & Championship Medals",
                category="Campus Events",
                amount=14200.0,
                expense_date=date(2026, 8, 10),
                payment_mode="CASH",
                reference_no="CASH-REC-102",
                payee_name="Champion Sports Accessories",
                description="Badminton racquets, footballs, trophies and certificates for Inter-College tournament",
                status="PAID",
                college_account_id=cash_acc.id if cash_acc else None,
                created_by="Sports Officer"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-008",
                title="College Bus Fleet Diesel & Quarterly Maintenance",
                category="Transport",
                amount=28600.0,
                expense_date=date(2026, 8, 4),
                payment_mode="ONLINE_TRANSFER",
                reference_no="UTR33102948",
                payee_name="Indian Oil Fuel Station & Servicing",
                description="Fuel refills for 4 college buses and brake overhaul for Bus #3",
                status="PAID",
                college_account_id=sbi_acc.id if sbi_acc else None,
                created_by="Transport Manager"
            ),
            CollegeExpense(
                voucher_no="EXP-2026-009",
                title="Mid-Term Examination Answer Sheets & Booklet Printing",
                category="Printing & Stationery",
                amount=16800.0,
                expense_date=date(2026, 8, 7),
                payment_mode="CASH",
                reference_no="CASH-REC-109",
                payee_name="Universal Printing Press",
                description="Printing 15,000 barcode-enabled answer booklets for upcoming semester exams",
                status="PAID",
                college_account_id=cash_acc.id if cash_acc else None,
                created_by="Exam Cell"
            )
        ]
        db.add_all(sample_expenses)
        db.commit()

    if db.query(LMSCourseContent).count() == 0:
        contents = [
            LMSCourseContent(subject_id=1, module_name="Module 1: C Basics", lesson_title="Pointers & Memory Allocation", content_type=ContentType.VIDEO, video_url="https://www.youtube.com/watch?v=zuegQmMdy8M", duration_minutes=45),
            LMSCourseContent(subject_id=1, module_name="Module 2: Data Structures", lesson_title="Linked Lists & Binary Trees PDF Notes", content_type=ContentType.PDF, file_url="/docs/linked_list.pdf", duration_minutes=30),
        ]
        db.add_all(contents)
        db.commit()

    if db.query(LMSQuiz).count() == 0:
        quiz = LMSQuiz(subject_id=1, title="Module 1 C Programming Quiz", duration_minutes=15, total_marks=10.0)
        db.add(quiz)
        db.flush()

        q1 = LMSQuizQuestion(quiz_id=quiz.id, question_text="What is the size of int in 32-bit C compiler?", option_a="2 Bytes", option_b="4 Bytes", option_c="8 Bytes", option_d="1 Byte", correct_option="B", marks=5.0)
        q2 = LMSQuizQuestion(quiz_id=quiz.id, question_text="Which operator is used for address of a variable?", option_a="*", option_b="&", option_c="->", option_d="%", correct_option="B", marks=5.0)
        db.add_all([q1, q2])
        db.commit()



# ==========================================
# PHASE 26 — LMS API ENDPOINTS
# ==========================================
@router.get("/lms/contents/{subject_id}")
def get_lms_contents(subject_id: int, db: Session = Depends(get_db)):
    """Get LMS Lesson Modules & Video Lectures for a Subject."""
    seed_enterprise_defaults(db)
    contents = db.query(LMSCourseContent).filter(LMSCourseContent.subject_id == subject_id).all()
    quizzes = db.query(LMSQuiz).filter(LMSQuiz.subject_id == subject_id).all()

    return {
        "subject_id": subject_id,
        "lessons": [{
            "id": c.id,
            "module_name": c.module_name,
            "lesson_title": c.lesson_title,
            "type": c.content_type.value if hasattr(c.content_type, "value") else str(c.content_type),
            "video_url": c.video_url,
            "file_url": c.file_url,
            "duration": c.duration_minutes
        } for c in contents],
        "quizzes": [{
            "id": q.id,
            "title": q.title,
            "duration": q.duration_minutes,
            "total_marks": q.total_marks,
            "question_count": len(q.questions)
        } for q in quizzes]
    }


@router.post("/lms/quiz/submit")
def submit_lms_quiz(payload: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Evaluate Timed LMS Quiz & Calculate Score."""
    quiz_id = payload.get("quiz_id")
    answers = payload.get("answers", {})  # {question_id: "B"}

    quiz = db.query(LMSQuiz).filter(LMSQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    score = 0.0
    questions = db.query(LMSQuizQuestion).filter(LMSQuizQuestion.quiz_id == quiz_id).all()
    for q in questions:
        ans = answers.get(str(q.id)) or answers.get(q.id)
        if ans and str(ans).upper() == q.correct_option:
            score += q.marks

    return {
        "quiz_title": quiz.title,
        "score_obtained": score,
        "total_marks": quiz.total_marks,
        "percentage": round((score / quiz.total_marks * 100.0), 1) if quiz.total_marks > 0 else 100.0
    }


# ==========================================
# PHASE 27 — ONLINE ADMISSION PORTAL API
# ==========================================
@router.post("/admission/apply")
def submit_admission_application(payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Public Student Online Admission Application Registration."""
    email = payload.get("email")
    name = payload.get("applicant_name")
    mobile = payload.get("mobile")
    course = payload.get("course_applied", "B.A. I-SEM")

    existing = db.query(AdmissionApplication).filter(AdmissionApplication.email == email).first()
    if existing:
        return {"message": "Application already submitted", "registration_no": existing.registration_no, "status": existing.status}

    reg_no = f"ADM-2026-{uuid.uuid4().hex[:6].upper()}"
    app = AdmissionApplication(
        registration_no=reg_no,
        applicant_name=name,
        email=email,
        mobile=mobile,
        father_name=payload.get("father_name", "Father Name"),
        course_applied=course,
        tenth_percentage=float(payload.get("tenth_percentage", 75.0)),
        twelfth_percentage=float(payload.get("twelfth_percentage", 78.0)),
        category=payload.get("category", "General"),
        status=AdmissionStatus.SUBMITTED,
        created_at=datetime.utcnow()
    )
    db.add(app)
    db.commit()

    return {"message": "Online Admission Application Submitted Successfully!", "registration_no": reg_no, "status": "SUBMITTED"}


@router.post("/admission/confirm/{app_id}")
def confirm_admission_auto_provision(app_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Phase 27: Admission Confirmation & Atomic Auto-Provisioning Engine.
    Automatically creates Student User, StudentProfile, ParentProfile, Library Membership, and Fee Ledger!
    """
    app = db.query(AdmissionApplication).filter(AdmissionApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Admission application not found")

    app.status = AdmissionStatus.CONFIRMED

    # Auto-create Student User Account
    st_user = db.query(User).filter(User.email == app.email).first()
    if not st_user:
        st_user = User(
            email=app.email,
            hashed_password=hash_password("Student@123"),
            full_name=app.applicant_name,
            role=UserRole.student,
            phone=app.mobile,
            is_active=True
        )
        db.add(st_user)
        db.flush()

    # Auto-create Student Profile
    st_prof = db.query(StudentProfile).filter(StudentProfile.user_id == st_user.id).first()
    if not st_prof:
        st_prof = StudentProfile(
            user_id=st_user.id,
            roll_number=f"AC/{app.course_applied[:3].upper()}/2026/{st_user.id:04d}",
            class_name=app.course_applied,
            department="Arts",
            semester=1,
            father_name=app.father_name
        )
        db.add(st_prof)
        db.flush()

    # Auto-create Parent User & Profile
    parent_email = f"parent.{app.email}"
    par_user = db.query(User).filter(User.email == parent_email).first()
    if not par_user:
        par_user = User(
            email=parent_email,
            hashed_password=hash_password("Parent@123"),
            full_name=f"{app.father_name} (Parent)",
            role=UserRole.parent,
            phone=app.mobile,
            is_active=True
        )
        db.add(par_user)
        db.flush()

    par_prof = db.query(ParentProfile).filter(ParentProfile.user_id == par_user.id).first()
    if not par_prof:
        par_prof = ParentProfile(
            user_id=par_user.id,
            father_name=app.father_name,
            email=parent_email,
            mobile=app.mobile
        )
        db.add(par_prof)
        db.flush()
        db.add(ParentStudentMapping(parent_id=par_prof.id, student_id=st_prof.id, relationship_type=RelationshipType.FATHER))

    # Auto-create Library Member
    lib_mem = db.query(LibraryMemberRecord).filter(LibraryMemberRecord.user_id == st_user.id).first()
    if not lib_mem:
        db.add(LibraryMemberRecord(user_id=st_user.id, member_code=f"LIB-ST-{st_user.id:04d}", member_type=MemberType.STUDENT))

    # Auto-create Fee Ledger
    fee_sum = db.query(FeeSummary).filter(FeeSummary.student_id == st_user.id).first()
    if not fee_sum:
        db.add(FeeSummary(student_id=st_user.id, total_fee=45000.0, total_paid=0.0, pending_fee=45000.0))

    db.commit()

    return {
        "message": f"Admission Confirmed & ERP Accounts Auto-Provisioned for {app.applicant_name}!",
        "registration_no": app.registration_no,
        "student_roll_no": st_prof.roll_number,
        "student_user_email": st_user.email,
        "parent_user_email": par_user.email
    }


# ==========================================
# PHASE 28 — FINANCE & ACCOUNTS ERP API
# ==========================================
@router.post("/finance/journal-entry")
def post_journal_voucher(payload: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Phase 28: Double-Entry Journal Voucher Posting Engine.
    Validates Sum(Debit) == Sum(Credit).
    """
    seed_enterprise_defaults(db)
    narration = payload.get("narration", "Tuition Fee Receipt Posting")
    line_items = payload.get("line_items", [])  # [{ledger_id: 1, debit: 10000, credit: 0}, {ledger_id: 3, debit: 0, credit: 10000}]

    total_debit = sum(float(item.get("debit", 0.0)) for item in line_items)
    total_credit = sum(float(item.get("credit", 0.0)) for item in line_items)

    if round(total_debit, 2) != round(total_credit, 2):
        raise HTTPException(status_code=400, detail=f"Double-Entry Validation Failed: Total Debit (₹{total_debit}) != Total Credit (₹{total_credit})")

    v_no = f"VOU-2026-{uuid.uuid4().hex[:6].upper()}"
    entry = JournalEntry(
        voucher_no=v_no,
        voucher_type=VoucherType.JOURNAL,
        entry_date=date.today(),
        narration=narration,
        total_amount=total_debit,
        created_at=datetime.utcnow()
    )
    db.add(entry)
    db.flush()

    for item in line_items:
        lid = item.get("ledger_id")
        deb = float(item.get("debit", 0.0))
        cred = float(item.get("credit", 0.0))

        db.add(JournalLineItem(journal_entry_id=entry.id, ledger_id=lid, debit_amount=deb, credit_amount=cred))
        # Update ledger balance
        ledger = db.query(LedgerAccount).filter(LedgerAccount.id == lid).first()
        if ledger:
            ledger.current_balance += (deb - cred)

    db.commit()

    return {"message": "Double-Entry Journal Voucher Posted Successfully!", "voucher_no": v_no, "amount": total_debit}


@router.get("/finance/reports/{report_type}")
def get_financial_reports(report_type: str, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """
    Phase 28: Trial Balance, General Ledger, Cash Book Financial Reports.
    """
    seed_enterprise_defaults(db)
    if report_type == "trial-balance":
        accounts = db.query(LedgerAccount).all()
        # Sum debits and credits across all journal line items for 100% accuracy
        debits = db.query(func.sum(JournalLineItem.debit_amount)).scalar() or 0.0
        credits = db.query(func.sum(JournalLineItem.credit_amount)).scalar() or 0.0

        return {
            "report_title": "Official Trial Balance Report",
            "is_balanced": round(debits, 2) == round(credits, 2),
            "total_debit": float(debits),
            "total_credit": float(credits),
            "accounts": [{
                "code": a.account_code,
                "name": a.account_name,
                "type": a.account_type.value if hasattr(a.account_type, "value") else str(a.account_type),
                "debit": a.current_balance if a.account_type in [AccountType.ASSET, AccountType.EXPENSE] else 0.0,
                "credit": abs(a.current_balance) if a.account_type in [AccountType.INCOME, AccountType.LIABILITY, AccountType.EQUITY] else 0.0
            } for a in accounts]
        }
    elif report_type == "cash-book":
        vouchers = db.query(JournalEntry).order_by(desc(JournalEntry.id)).all()
        return {
            "report_title": "Official Cash Book Register",
            "vouchers": [{
                "voucher_no": v.voucher_no,
                "date": v.entry_date.strftime("%d-%m-%Y"),
                "narration": v.narration,
                "amount": v.total_amount
            } for v in vouchers]
        }
    else:
        raise HTTPException(status_code=400, detail="Unsupported financial report type")


# ==========================================
# PHASE 29 — COLLEGE ACCOUNTS & EXPENSES API
# ==========================================
@router.get("/finance/college-accounts")
def get_college_accounts(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Retrieve all active College Bank & Cash Accounts and Total Liquidity."""
    seed_enterprise_defaults(db)
    accounts = db.query(CollegeAccount).all()
    total_liquidity = sum(a.current_balance for a in accounts if a.is_active)

    return {
        "total_liquidity": total_liquidity,
        "count": len(accounts),
        "accounts": [{
            "id": a.id,
            "account_name": a.account_name,
            "account_number": a.account_number,
            "bank_name": a.bank_name,
            "branch_name": a.branch_name,
            "ifsc_code": a.ifsc_code,
            "account_type": a.account_type,
            "current_balance": a.current_balance,
            "is_active": a.is_active,
            "created_at": a.created_at.strftime("%Y-%m-%d") if a.created_at else None
        } for a in accounts]
    }


@router.post("/finance/college-accounts")
def create_college_account(payload: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """Create a new College Bank or Cash Account."""
    account_name = payload.get("account_name")
    account_number = payload.get("account_number")
    bank_name = payload.get("bank_name", "State Bank of India")
    opening_balance = float(payload.get("opening_balance", 0.0))

    if not account_name or not account_number:
        raise HTTPException(status_code=400, detail="Account Name and Account Number are required")

    existing = db.query(CollegeAccount).filter(CollegeAccount.account_number == account_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="College Account with this Account Number already exists")

    acc = CollegeAccount(
        account_name=account_name,
        account_number=account_number,
        bank_name=bank_name,
        branch_name=payload.get("branch_name", "Main Campus"),
        ifsc_code=payload.get("ifsc_code", "SBIN0001234"),
        account_type=payload.get("account_type", "CURRENT"),
        current_balance=opening_balance,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(acc)

    # Also register a corresponding Ledger Account if not present
    ledger_code = f"10{10 + db.query(LedgerAccount).count()}"
    l_acc = LedgerAccount(
        account_code=ledger_code,
        account_name=f"{account_name} ({bank_name})",
        account_type=AccountType.ASSET,
        opening_balance=opening_balance,
        current_balance=opening_balance
    )
    db.add(l_acc)
    db.commit()

    return {"message": "College Account Created Successfully!", "id": acc.id, "account_name": acc.account_name}


@router.get("/finance/college-expenses")
def get_college_expenses(
    search: Optional[str] = None,
    category: Optional[str] = None,
    account_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Get all expenses paid or pending from the college accounts with complete filtering,
    salary breakdown, category totals, and summary analytics.
    """
    seed_enterprise_defaults(db)
    query = db.query(CollegeExpense)

    if search:
        s = f"%{search}%"
        query = query.filter(or_(
            CollegeExpense.title.ilike(s),
            CollegeExpense.payee_name.ilike(s),
            CollegeExpense.voucher_no.ilike(s),
            CollegeExpense.reference_no.ilike(s),
            CollegeExpense.description.ilike(s)
        ))

    if category and category != "ALL":
        query = query.filter(CollegeExpense.category == category)

    if account_id:
        query = query.filter(CollegeExpense.college_account_id == account_id)

    if status and status != "ALL":
        query = query.filter(CollegeExpense.status == status)

    if start_date:
        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(CollegeExpense.expense_date >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(CollegeExpense.expense_date <= ed)
        except ValueError:
            pass

    expenses = query.order_by(desc(CollegeExpense.expense_date), desc(CollegeExpense.id)).all()

    # Summaries
    all_exp = db.query(CollegeExpense).all()
    total_expenses_amount = sum(e.amount for e in all_exp)
    total_paid = sum(e.amount for e in all_exp if e.status == "PAID")
    total_pending = sum(e.amount for e in all_exp if e.status == "PENDING")
    salary_expenses_amount = sum(e.amount for e in all_exp if "Salary" in e.category or "Payroll" in e.title)

    # Category breakdown
    category_breakdown = {}
    for e in all_exp:
        cat = e.category or "Miscellaneous"
        category_breakdown[cat] = category_breakdown.get(cat, 0.0) + e.amount

    return {
        "total_expenses_amount": total_expenses_amount,
        "total_paid": total_paid,
        "total_pending": total_pending,
        "salary_expenses_amount": salary_expenses_amount,
        "count": len(expenses),
        "category_breakdown": category_breakdown,
        "expenses": [{
            "id": e.id,
            "voucher_no": e.voucher_no,
            "title": e.title,
            "category": e.category,
            "amount": e.amount,
            "expense_date": e.expense_date.strftime("%Y-%m-%d") if e.expense_date else None,
            "payment_mode": e.payment_mode,
            "reference_no": e.reference_no,
            "payee_name": e.payee_name,
            "description": e.description,
            "status": e.status,
            "receipt_url": e.receipt_url,
            "college_account_id": e.college_account_id,
            "account_name": e.college_account.account_name if e.college_account else "General College Account",
            "created_by": e.created_by,
            "created_at": e.created_at.strftime("%Y-%m-%d %H:%M") if e.created_at else None
        } for e in expenses]
    }


@router.post("/finance/college-expenses")
def record_college_expense(payload: Dict[str, Any], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Record a new expenditure from a college account.
    Deducts balance from CollegeAccount and posts a double-entry Journal Voucher to General Ledger.
    """
    seed_enterprise_defaults(db)
    title = payload.get("title")
    category = payload.get("category", "Miscellaneous")
    amount = float(payload.get("amount", 0.0))
    account_id = payload.get("college_account_id")
    payee_name = payload.get("payee_name", "Vendor / Staff")
    payment_mode = payload.get("payment_mode", "ONLINE_TRANSFER")
    reference_no = payload.get("reference_no", f"TXN-{uuid.uuid4().hex[:8].upper()}")
    description = payload.get("description", "")
    expense_date_str = payload.get("expense_date")

    if not title or amount <= 0:
        raise HTTPException(status_code=400, detail="Expense title and valid positive amount are required")

    c_account = None
    if account_id:
        c_account = db.query(CollegeAccount).filter(CollegeAccount.id == account_id).first()
    if not c_account:
        c_account = db.query(CollegeAccount).filter(CollegeAccount.is_active == True).first()

    if not c_account:
        raise HTTPException(status_code=400, detail="No active college account found to disburse funds")

    exp_date = date.today()
    if expense_date_str:
        try:
            exp_date = datetime.strptime(expense_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Deduct from College Account balance if status is PAID
    status = payload.get("status", "PAID")
    if status == "PAID":
        if c_account.current_balance < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient funds in {c_account.account_name}! Available balance: ₹{c_account.current_balance:,.2f}")
        c_account.current_balance -= amount

    v_no = f"EXP-2026-{uuid.uuid4().hex[:6].upper()}"
    exp = CollegeExpense(
        voucher_no=v_no,
        title=title,
        category=category,
        amount=amount,
        expense_date=exp_date,
        payment_mode=payment_mode,
        reference_no=reference_no,
        payee_name=payee_name,
        description=description,
        status=status,
        receipt_url=payload.get("receipt_url"),
        college_account_id=c_account.id,
        created_by=current_user.full_name or "Admin",
        created_at=datetime.utcnow()
    )
    db.add(exp)

    # Post Double-Entry Journal Entry in General Ledger
    # Find matching Expense Ledger Account
    expense_ledger = db.query(LedgerAccount).filter(
        LedgerAccount.account_type == AccountType.EXPENSE,
        LedgerAccount.account_name.ilike(f"%{category.split()[0]}%")
    ).first()

    if not expense_ledger:
        expense_ledger = db.query(LedgerAccount).filter(LedgerAccount.account_code == "4001").first()

    # Asset/Bank Ledger Account
    bank_ledger = db.query(LedgerAccount).filter(
        LedgerAccount.account_name.ilike(f"%{c_account.bank_name[:4]}%")
    ).first()
    if not bank_ledger:
        bank_ledger = db.query(LedgerAccount).filter(LedgerAccount.account_code == "1002").first()

    if expense_ledger and bank_ledger and status == "PAID":
        journal = JournalEntry(
            voucher_no=v_no,
            voucher_type=VoucherType.PAYMENT,
            entry_date=exp_date,
            narration=f"Expense Payment for {title} ({category}) to {payee_name}",
            total_amount=amount,
            created_at=datetime.utcnow()
        )
        db.add(journal)
        db.flush()

        # Debit Expense Account, Credit Bank Account
        db.add(JournalLineItem(journal_entry_id=journal.id, ledger_id=expense_ledger.id, debit_amount=amount, credit_amount=0.0))
        db.add(JournalLineItem(journal_entry_id=journal.id, ledger_id=bank_ledger.id, debit_amount=0.0, credit_amount=amount))

        expense_ledger.current_balance += amount
        bank_ledger.current_balance -= amount

    db.commit()

    return {
        "message": f"College Expense recorded successfully! Amount ₹{amount:,.2f} disbursed from {c_account.account_name}.",
        "voucher_no": v_no,
        "remaining_account_balance": c_account.current_balance
    }


@router.put("/finance/college-expenses/{expense_id}")
def update_college_expense(expense_id: int, payload: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """Update expense details or mark pending expense as PAID."""
    exp = db.query(CollegeExpense).filter(CollegeExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense record not found")

    old_status = exp.status
    new_status = payload.get("status", old_status)

    if "title" in payload:
        exp.title = payload["title"]
    if "category" in payload:
        exp.category = payload["category"]
    if "payee_name" in payload:
        exp.payee_name = payload["payee_name"]
    if "payment_mode" in payload:
        exp.payment_mode = payload["payment_mode"]
    if "reference_no" in payload:
        exp.reference_no = payload["reference_no"]
    if "description" in payload:
        exp.description = payload["description"]

    # If status changed from PENDING to PAID, deduct from college account balance
    if old_status == "PENDING" and new_status == "PAID":
        acc = db.query(CollegeAccount).filter(CollegeAccount.id == exp.college_account_id).first()
        if acc:
            if acc.current_balance < exp.amount:
                raise HTTPException(status_code=400, detail=f"Insufficient balance in {acc.account_name} to pay this expense.")
            acc.current_balance -= exp.amount
        exp.status = "PAID"

    db.commit()

    return {"message": "College Expense Updated Successfully!", "id": exp.id, "status": exp.status}


@router.delete("/finance/college-expenses/{expense_id}")
def delete_college_expense(expense_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """Delete an expense entry and refund account balance if it was PAID."""
    exp = db.query(CollegeExpense).filter(CollegeExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense record not found")

    if exp.status == "PAID" and exp.college_account_id:
        acc = db.query(CollegeAccount).filter(CollegeAccount.id == exp.college_account_id).first()
        if acc:
            acc.current_balance += exp.amount

    db.delete(exp)
    db.commit()

    return {"message": "College Expense Deleted and Account Balance Restored."}


@router.get("/finance/ledger-entries")
def get_ledger_entries(ledger_id: Optional[int] = None, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Get General Ledger Account balances and detailed transaction entries."""
    seed_enterprise_defaults(db)
    accounts = db.query(LedgerAccount).all()
    
    entries_query = db.query(JournalLineItem).join(JournalEntry)
    if ledger_id:
        entries_query = entries_query.filter(JournalLineItem.ledger_id == ledger_id)
        
    line_items = entries_query.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.id)).all()

    return {
        "chart_of_accounts": [{
            "id": a.id,
            "code": a.account_code,
            "name": a.account_name,
            "type": a.account_type.value if hasattr(a.account_type, "value") else str(a.account_type),
            "opening_balance": a.opening_balance,
            "current_balance": a.current_balance
        } for a in accounts],
        "entries": [{
            "id": li.id,
            "voucher_no": li.journal_entry.voucher_no if li.journal_entry else "N/A",
            "entry_date": li.journal_entry.entry_date.strftime("%Y-%m-%d") if li.journal_entry and li.journal_entry.entry_date else None,
            "narration": li.journal_entry.narration if li.journal_entry else "",
            "account_code": li.ledger.account_code if li.ledger else "",
            "account_name": li.ledger.account_name if li.ledger else "",
            "debit": li.debit_amount,
            "credit": li.credit_amount
        } for li in line_items]
    }

