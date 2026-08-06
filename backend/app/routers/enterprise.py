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
    ContentType, AdmissionStatus, AccountType, VoucherType
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user
from app.utils.password_handler import hash_password

router = APIRouter(prefix="/api", tags=["Enterprise LMS, Admission & Finance ERP"])


def seed_enterprise_defaults(db: Session):
    """Seed initial LMS content, Chart of Accounts if empty."""
    if db.query(LedgerAccount).count() == 0:
        accounts = [
            LedgerAccount(account_code="1001", account_name="Cash in Hand", account_type=AccountType.ASSET, opening_balance=50000.0, current_balance=50000.0),
            LedgerAccount(account_code="1002", account_name="State Bank of India Account", account_type=AccountType.ASSET, opening_balance=250000.0, current_balance=250000.0),
            LedgerAccount(account_code="3001", account_name="Student Tuition Fee Revenue", account_type=AccountType.INCOME, opening_balance=0.0, current_balance=0.0),
            LedgerAccount(account_code="4001", account_name="Faculty & Staff Salary Expense", account_type=AccountType.EXPENSE, opening_balance=0.0, current_balance=0.0),
        ]
        db.add_all(accounts)
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
