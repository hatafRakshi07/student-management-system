from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.attendance import Attendance
from app.models.exam import Mark, Exam
from app.models.assignment import Assignment, Submission
from app.models.fee import Fee, FeeSummary
from app.utils.auth_deps import get_current_user, require_teacher_or_admin, require_student

router = APIRouter(prefix="/api/students", tags=["Students"])


@router.get("")
def list_students(
    search: Optional[str] = None,
    class_name: Optional[str] = None,
    department: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in (UserRole.admin, UserRole.teacher):
        raise HTTPException(status_code=403, detail="Access denied")

    from app.utils.teacher_access import filter_student_query_for_teacher

    q = (db.query(User, StudentProfile, FeeSummary)
         .join(StudentProfile, User.id == StudentProfile.user_id)
         .outerjoin(FeeSummary, User.id == FeeSummary.student_id)
         .filter(User.role == UserRole.student, User.is_active == True))

    # Apply backend SQL access filter for teachers
    q = filter_student_query_for_teacher(q, current_user, db)

    if search:
        q = q.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%") |
            StudentProfile.roll_number.ilike(f"%{search}%"))
    if class_name:
        q = q.filter(StudentProfile.class_name == class_name)
    if department:
        q = q.filter(StudentProfile.department == department)
    total = q.count()
    results = q.offset(skip).limit(limit).all()
    return {"total": total, "students": [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "student_name": u.full_name or (sp.student_name if sp else None),
            "phone": u.phone,
            "mobile": u.phone or (sp.mobile if sp else None) or (sp.father_mobile if sp else None),
            "profile_photo": u.profile_photo,
            "roll_number": sp.roll_number if sp else None,
            "scholar_no": sp.roll_number if sp else None,
            "reg_no": (sp.reg_no if sp else None) or (sp.roll_number if sp else None),
            "admission_no": sp.admission_no if sp else None,
            "father_name": sp.father_name if sp else None,
            "mother_name": sp.mother_name if sp else None,
            "category": sp.category if sp else None,
            "status": (sp.status if sp else None) or ("ACTIVE" if u.is_active else "INACTIVE"),
            "department": sp.department if sp else None,
            "class_name": sp.class_name if sp else None,
            "section": sp.section if sp else None,
            "semester": sp.semester if sp else None,
            "year": sp.year if sp else None,
            "created_at": u.created_at,
            "total_fee": fs.total_fee if fs else 0.0,
            "total_paid": fs.total_paid if fs else 0.0,
            "pending_fee": fs.pending_fee if fs else 0.0,
            "fee_status": fs.current_status if fs else "UNPAID"
        }
        for u, sp, fs in results]}


@router.get("/profile")
def my_profile(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    return {
        "id": current_user.id, "email": current_user.email, "full_name": current_user.full_name,
        "phone": current_user.phone, "profile_photo": current_user.profile_photo,
        "roll_number": sp.roll_number if sp else None,
        "department": sp.department if sp else None,
        "class_name": sp.class_name if sp else None,
        "section": sp.section if sp else None,
        "semester": sp.semester if sp else None,
        "year": sp.year if sp else None,
    }


@router.get("/attendance")
def my_attendance(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    records = db.query(Attendance).filter(Attendance.student_id == current_user.id).all()
    total = len(records)
    present = sum(1 for r in records if (r.status.value if hasattr(r.status, "value") else str(r.status)).lower() in ("present", "late"))
    pct = round((present / total) * 100, 2) if total > 0 else 0
    return {
        "total_classes": total, "present": present, "absent": total - present,
        "percentage": pct,
        "records": [{"id": r.id, "date": r.date,
                     "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                     "subject_id": r.subject_id} for r in records],
    }


@router.get("/marks")
def my_marks(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    marks = (db.query(Mark, Exam).join(Exam, Mark.exam_id == Exam.id)
             .filter(Mark.student_id == current_user.id).all())
    return {"marks": [
        {"id": m.id, "exam_title": e.title,
         "exam_type": e.exam_type.value if hasattr(e.exam_type, "value") else str(e.exam_type),
         "subject_id": e.subject_id, "marks_obtained": m.marks_obtained,
         "total_marks": e.total_marks,
         "percentage": round((m.marks_obtained / e.total_marks) * 100, 2) if (e.total_marks and m.marks_obtained is not None and e.total_marks > 0) else 0.0,
         "grade": m.grade, "remarks": m.remarks, "exam_date": e.exam_date}
        for m, e in marks]}


@router.get("/assignments")
def my_assignments(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    assignments = db.query(Assignment).filter(Assignment.is_active == True).all()
    result = []
    for a in assignments:
        sub = db.query(Submission).filter(
            Submission.assignment_id == a.id, Submission.student_id == current_user.id).first()
        result.append({
            "id": a.id, "title": a.title, "description": a.description,
            "deadline": a.deadline, "subject_id": a.subject_id, "max_marks": a.max_marks,
            "submitted": sub is not None,
            "submission": {"id": sub.id,
                           "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
                           "marks_obtained": sub.marks_obtained, "grade": sub.grade,
                           "submitted_at": sub.submitted_at} if sub else None,
        })
    return {"assignments": result}


@router.get("/fees")
def my_fees(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    from app.models.fee import FeeReceipt, FeeSummary, FeeTransaction

    summary = db.query(FeeSummary).filter(FeeSummary.student_id == current_user.id).first()
    receipts = db.query(FeeReceipt).filter(FeeReceipt.student_id == current_user.id).order_by(FeeReceipt.receipt_id.desc()).all()
    txs = db.query(FeeTransaction).filter(FeeTransaction.student_id == current_user.id).order_by(FeeTransaction.id.desc()).all()

    total_amt = summary.total_fee if summary else (sum(r.amount for r in receipts) or sum(t.paid_amount for t in txs) or 45000.0)
    paid_amt = summary.total_paid if summary else (sum(r.amount for r in receipts) or sum(t.paid_amount for t in txs) or 0.0)
    pending_amt = summary.pending_fee if summary else max(0.0, total_amt - paid_amt)

    fee_list = []
    seen_ids = set()

    for r in receipts:
        fee_list.append({
            "id": r.receipt_id,
            "amount": r.amount,
            "fee_type": f"Fee Receipt #{r.receipt_no or r.receipt_id}",
            "description": f"Session {r.session or ''} - Mode: {r.payment_mode or 'CASH'}",
            "due_date": r.receipt_date or r.created_at,
            "payment_date": r.receipt_date or r.created_at,
            "status": "paid",
            "transaction_id": r.transaction_id or r.voucher_no
        })
        seen_ids.add(r.receipt_id)

    for t in txs:
        if t.id not in seen_ids:
            fee_list.append({
                "id": t.id + 500000,
                "amount": t.paid_amount,
                "fee_type": f"Fee Installment ({t.installment or '2023-24'})",
                "description": f"Class {t.class_name or ''} - Bank / Cash Deposit",
                "due_date": t.created_at,
                "payment_date": t.created_at,
                "status": "paid",
                "transaction_id": t.reg_no or f"TX-{t.id}"
            })

    return {
        "total_amount": total_amt,
        "paid_amount": paid_amt,
        "pending_amount": pending_amt,
        "fees": fee_list
    }


@router.get("/search")
def search_students(
    query: Optional[str] = None,
    name: Optional[str] = None,
    scholar_no: Optional[str] = None,
    reg_no: Optional[str] = None,
    admission_no: Optional[str] = None,
    father_name: Optional[str] = None,
    mother_name: Optional[str] = None,
    mobile: Optional[str] = None,
    class_name: Optional[str] = None,
    semester: Optional[str] = None,
    session: Optional[str] = None,
    skip: int = 0, limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Step 13: Search student by Name, Scholar Number, Registration Number, Admission Number,
    Father Name, Mother Name, Mobile Number, Class, Semester, Session.
    Enforces backend teacher access boundaries.
    """
    if current_user.role not in (UserRole.admin, UserRole.teacher):
        raise HTTPException(status_code=403, detail="Access denied")

    from app.models.student import StudentAcademicHistory
    from app.utils.teacher_access import filter_student_query_for_teacher

    q = db.query(User, StudentProfile, FeeSummary).join(StudentProfile, User.id == StudentProfile.user_id).outerjoin(FeeSummary, User.id == FeeSummary.student_id).filter(User.role == UserRole.student)

    # Apply backend SQL access filter for teachers
    q = filter_student_query_for_teacher(q, current_user, db)

    if query:
        q = q.filter(
            User.full_name.ilike(f"%{query}%") |
            User.phone.ilike(f"%{query}%") |
            StudentProfile.roll_number.ilike(f"%{query}%") |
            StudentProfile.reg_no.ilike(f"%{query}%") |
            StudentProfile.admission_no.ilike(f"%{query}%") |
            StudentProfile.father_name.ilike(f"%{query}%") |
            StudentProfile.mother_name.ilike(f"%{query}%")
        )

    if name:
        q = q.filter(User.full_name.ilike(f"%{name}%") | StudentProfile.student_name.ilike(f"%{name}%"))
    if scholar_no:
        q = q.filter(StudentProfile.roll_number.ilike(f"%{scholar_no}%"))
    if reg_no:
        q = q.filter(StudentProfile.reg_no.ilike(f"%{reg_no}%"))
    if admission_no:
        q = q.filter(StudentProfile.admission_no.ilike(f"%{admission_no}%"))
    if father_name:
        q = q.filter(StudentProfile.father_name.ilike(f"%{father_name}%"))
    if mother_name:
        q = q.filter(StudentProfile.mother_name.ilike(f"%{mother_name}%"))
    if mobile:
        q = q.filter(
            User.phone.ilike(f"%{mobile}%") |
            StudentProfile.father_mobile.ilike(f"%{mobile}%") |
            StudentProfile.mother_mobile.ilike(f"%{mobile}%")
        )
    if class_name:
        q = q.filter(StudentProfile.class_name.ilike(f"%{class_name}%"))
    if semester:
        q = q.filter(StudentProfile.semester == int(semester) if str(semester).isdigit() else StudentProfile.semester)
    if session:
        subq = db.query(StudentAcademicHistory.student_id).filter(StudentAcademicHistory.session.ilike(f"%{session}%")).subquery()
        q = q.filter(User.id.in_(subq))

    total = q.count()
    results = q.offset(skip).limit(limit).all()

    return {
        "total": total,
        "students": [
            {
                "id": u.id,
                "scholar_no": sp.roll_number,
                "reg_no": sp.reg_no,
                "admission_no": sp.admission_no,
                "student_name": u.full_name or sp.student_name,
                "father_name": sp.father_name,
                "mother_name": sp.mother_name,
                "dob": sp.date_of_birth,
                "gender": sp.gender,
                "mobile": u.phone or sp.father_mobile,
                "class_name": sp.class_name,
                "section": sp.section,
                "department": sp.department,
                "category": sp.category,
                "status": sp.status or ("ACTIVE" if u.is_active else "INACTIVE"),
                "total_fee": fs.total_fee if fs else 0.0,
                "total_paid": fs.total_paid if fs else 0.0,
                "pending_fee": fs.pending_fee if fs else 0.0,
                "fee_status": fs.current_status if fs else "UNPAID"
            }
            for u, sp, fs in results
        ]
    }


@router.get("/dashboard/{student_id}")
def get_student_dashboard(
    student_id: int,
    db: Session = Depends(get_db)
):
    """
    Step 11: Comprehensive Student Dashboard payload returning:
    Profile, Academic History, Fee Summary, Fee Receipts, Pending Fees, Attendance, Documents, Promotion History.
    """
    from app.models.fee import FeeReceipt, FeeSummary
    from app.models.student import StudentAcademicHistory, StudentPromotion, StudentDocument

    user = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    sp = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    ac_history = db.query(StudentAcademicHistory).filter(StudentAcademicHistory.student_id == student_id).all()
    fee_sum = db.query(FeeSummary).filter(FeeSummary.student_id == student_id).first()
    receipts = db.query(FeeReceipt).filter(FeeReceipt.student_id == student_id).order_by(FeeReceipt.receipt_date.desc()).all()
    promotions = db.query(StudentPromotion).filter(StudentPromotion.student_id == student_id).all()
    docs = db.query(StudentDocument).filter(StudentDocument.student_id == student_id).all()

    # Attendance calculation
    attendance_records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    total_att = len(attendance_records)
    present_att = sum(1 for a in attendance_records if (a.status.value if hasattr(a.status, "value") else str(a.status)).lower() in ("present", "late"))
    att_percentage = round((present_att / total_att) * 100, 2) if total_att > 0 else 0.0

    return {
        "profile": {
            "student_id": user.id,
            "username": user.username,
            "email": user.email,
            "student_name": user.full_name,
            "scholar_no": sp.roll_number if sp else None,
            "registration_no": sp.reg_no if sp else None,
            "admission_no": sp.admission_no if sp else None,
            "father_name": sp.father_name if sp else None,
            "mother_name": sp.mother_name if sp else None,
            "dob": sp.date_of_birth if sp else None,
            "gender": sp.gender if sp else None,
            "mobile": user.phone or (sp.father_mobile if sp else None),
            "father_mobile": sp.father_mobile if sp else None,
            "mother_mobile": sp.mother_mobile if sp else None,
            "category": sp.category if sp else None,
            "religion": sp.religion if sp else None,
            "blood_group": sp.blood_group if sp else None,
            "address": sp.address if sp else None,
            "class_name": sp.class_name if sp else None,
            "section": sp.section if sp else None,
            "department": sp.department if sp else None
        },
        "academic_history": [
            {
                "academic_id": ah.academic_id,
                "session": ah.session,
                "course": ah.course,
                "class_name": ah.class_name,
                "section": ah.section,
                "roll_no": ah.roll_no,
                "admission_date": ah.admission_date,
                "status": ah.status
            }
            for ah in ac_history
        ],
        "fee_summary": {
            "total_fee": fee_sum.total_fee if fee_sum else 0.0,
            "total_paid": fee_sum.total_paid if fee_sum else 0.0,
            "discount": fee_sum.discount if fee_sum else 0.0,
            "pending_fee": fee_sum.pending_fee if fee_sum else 0.0,
            "balance": fee_sum.balance if fee_sum else 0.0,
            "last_payment_date": fee_sum.last_payment_date if fee_sum else None,
            "current_status": fee_sum.current_status if fee_sum else "UNPAID"
        },
        "fee_receipts": [
            {
                "receipt_id": r.receipt_id,
                "voucher_no": r.voucher_no,
                "receipt_no": r.receipt_no,
                "receipt_date": r.receipt_date,
                "payment_mode": r.payment_mode,
                "amount": r.amount,
                "discount": r.discount,
                "bank_name": r.bank_name,
                "remarks": r.remarks,
                "session": r.session
            }
            for r in receipts
        ],
        "attendance": {
            "total_classes": total_att,
            "present_count": present_att,
            "percentage": att_percentage
        },
        "documents": [
            {"id": d.id, "name": d.document_name, "type": d.document_type, "path": d.file_path}
            for d in docs
        ],
        "promotion_history": [
            {"from_session": p.from_session, "to_session": p.to_session, "from_class": p.from_class, "to_class": p.to_class, "date": p.promotion_date}
            for p in promotions
        ]
    }


@router.get("/{student_id}")
def get_student(student_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    return {"id": user.id, "email": user.email, "full_name": user.full_name,
            "phone": user.phone, "roll_number": sp.roll_number if sp else None,
            "department": sp.department if sp else None, "class_name": sp.class_name if sp else None}


@router.delete("/{student_id}")
def delete_student(student_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == student_id, User.role == UserRole.student).first()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    user.is_active = False
    db.commit()
    return {"message": "Student deactivated"}

