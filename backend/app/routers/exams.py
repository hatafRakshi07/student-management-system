from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.teacher import TeacherProfile
from app.models.subject import Subject
from app.models.exam import (
    ExamSchedule, MarkRecord, ResultSummary, GradeSystemRule,
    CGPAHistory, BacklogHistory, RevaluationRequest, ExamAuditLog,
    ExamCategory, ResultStatus, Exam, Mark
)
from app.services.exam_service import (
    calculate_student_semester_result,
    update_class_ranks,
    get_grade_for_percentage,
    log_exam_audit,
    seed_default_grade_system
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/exams", tags=["Exams & Results"])


# Aliases so frontend GET/POST /exams also work (same as /schedule)
@router.get("")
def list_exams_alias(
    class_name: Optional[str] = None,
    semester: Optional[int] = None,
    session_year: Optional[str] = None,
    _=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_exam_schedules(class_name=class_name, semester=semester, session_year=session_year, _=_, db=db)


@router.post("")
def create_exam_alias(payload: Dict[str, Any], _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    return create_exam_schedule(payload=payload, _=_, db=db)


@router.post("/schedule")
def create_exam_schedule(
    payload: Dict[str, Any],
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """Admin / Faculty Exam Schedule Creation Endpoint."""
    title = payload.get("title")
    class_name = payload.get("class_name")
    department = payload.get("department")
    semester = payload.get("semester", 1)
    session_year = payload.get("session_year", "2024-25")
    subject_id = payload.get("subject_id")
    category_str = payload.get("exam_category", "SEMESTER").upper()
    exam_date_str = payload.get("exam_date", str(date.today()))

    try:
        exam_category = ExamCategory(category_str)
    except ValueError:
        exam_category = ExamCategory.SEMESTER

    try:
        exam_date = datetime.strptime(exam_date_str, "%Y-%m-%d")
    except ValueError:
        exam_date = datetime.utcnow()

    schedule = ExamSchedule(
        title=title,
        session_year=session_year,
        semester=semester,
        class_name=class_name,
        department=department,
        subject_id=subject_id,
        exam_category=exam_category,
        exam_date=exam_date,
        total_marks=payload.get("total_marks", 100.0),
        theory_max=payload.get("theory_max", 70.0),
        internal_max=payload.get("internal_max", 20.0),
        practical_max=payload.get("practical_max", 10.0),
        passing_marks=payload.get("passing_marks", 40.0),
        status="PUBLISHED",
        created_at=datetime.utcnow()
    )
    db.add(schedule)
    db.commit()

    return {"message": "Exam schedule created successfully", "exam_id": schedule.id}


@router.get("/schedule")
def list_exam_schedules(
    class_name: Optional[str] = None,
    semester: Optional[int] = None,
    session_year: Optional[str] = None,
    _=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List exam schedules with filtering."""
    q = db.query(ExamSchedule, Subject).outerjoin(Subject, ExamSchedule.subject_id == Subject.id)
    if class_name:
        q = q.filter(ExamSchedule.class_name == class_name)
    if semester:
        q = q.filter(ExamSchedule.semester == semester)
    if session_year:
        q = q.filter(ExamSchedule.session_year == session_year)

    schedules = q.order_by(ExamSchedule.exam_date.asc()).all()

    return [{
        "id": s.id,
        "title": s.title,
        "class_name": s.class_name,
        "semester": s.semester,
        "session_year": s.session_year,
        "subject_name": sub.name if sub else "General",
        "exam_category": s.exam_category.value if hasattr(s.exam_category, "value") else str(s.exam_category),
        "exam_date": s.exam_date.strftime("%d-%m-%Y %I:%M %p"),
        "total_marks": s.total_marks,
        "passing_marks": s.passing_marks,
        "status": s.status
    } for s, sub in schedules]


@router.post("/marks/bulk")
def submit_bulk_marks(
    payload: Dict[str, Any],
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Faculty / Admin Bulk Marks Entry Endpoint.
    Computes Theory, Internal, Practical, Grace, Total Obtained, Grade & Points,
    and updates student ResultSummary & Class Ranks.
    """
    exam_id = payload.get("exam_id")
    mark_items = payload.get("marks", [])  # List of {student_id: int, theory: float, internal: float, practical: float, grace: float}

    exam = db.query(ExamSchedule).filter(ExamSchedule.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam schedule not found")

    submitted = 0
    updated = 0

    for item in mark_items:
        sid = item.get("student_id")
        th = float(item.get("theory", 0.0))
        in_m = float(item.get("internal", 0.0))
        pr = float(item.get("practical", 0.0))
        gr = float(item.get("grace", 0.0))

        tot = th + in_m + pr + gr
        pct = round((tot / exam.total_marks * 100.0), 2) if exam.total_marks > 0 else 0.0
        grade_let, grade_pt = get_grade_for_percentage(pct)
        is_pass = (tot >= exam.passing_marks) and (grade_let != "F")

        rec = db.query(MarkRecord).filter(MarkRecord.student_id == sid, MarkRecord.exam_id == exam_id).first()

        if rec:
            old_tot = rec.total_obtained
            rec.theory_marks = th
            rec.internal_marks = in_m
            rec.practical_marks = pr
            rec.grace_marks = gr
            rec.marks_obtained = tot
            rec.total_obtained = tot
            rec.letter_grade = grade_let
            rec.grade_point = grade_pt
            rec.is_pass = is_pass
            rec.marked_by_id = current_user.id
            rec.updated_at = datetime.utcnow()
            updated += 1
            log_exam_audit(db, rec.id, current_user.id, old_tot, tot, "Bulk Edit")
        else:
            rec = MarkRecord(
                student_id=sid,
                exam_id=exam_id,
                subject_id=exam.subject_id,
                theory_marks=th,
                internal_marks=in_m,
                practical_marks=pr,
                grace_marks=gr,
                marks_obtained=tot,
                total_obtained=tot,
                letter_grade=grade_let,
                grade_point=grade_pt,
                is_pass=is_pass,
                marked_by_id=current_user.id,
                created_at=datetime.utcnow()
            )
            db.add(rec)
            db.flush()
            submitted += 1
            log_exam_audit(db, rec.id, current_user.id, 0.0, tot, "Initial Entry")

        db.flush()
        # Recalculate Semester Result
        calculate_student_semester_result(db, sid, exam.session_year, exam.semester)

    # Recalculate Ranks
    update_class_ranks(db, exam.session_year, exam.semester)
    db.commit()

    return {"message": "Marks recorded successfully", "new_entries": submitted, "updated_entries": updated}


@router.get("/marksheet/{student_id}/{semester}")
def get_official_marksheet(
    student_id: int,
    semester: int,
    session_year: str = "2024-25",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 15: Official Printable PDF Marksheet & Transcript Payload.
    Includes Aklank College emblem header, student demographic info, subject-wise Theory/Internal/Practical grid,
    SGPA, CGPA, Division, Class Rank, and QR verification token.
    """
    if current_user.role == UserRole.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    u = db.query(User).filter(User.id == student_id).first()
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()

    summary = calculate_student_semester_result(db, student_id, session_year, semester)
    update_class_ranks(db, session_year, semester)
    db.refresh(summary)

    marks = db.query(MarkRecord, ExamSchedule, Subject)\
        .join(ExamSchedule, MarkRecord.exam_id == ExamSchedule.id)\
        .outerjoin(Subject, MarkRecord.subject_id == Subject.id)\
        .filter(MarkRecord.student_id == student_id, ExamSchedule.semester == semester).all()

    subject_rows = []
    for m, ex, sub in marks:
        subject_rows.append({
            "subject_code": sub.code if sub else "SUB",
            "subject_name": sub.name if sub else ex.title,
            "credits": sub.credits if (sub and sub.credits) else 4,
            "theory_marks": m.theory_marks,
            "internal_marks": m.internal_marks,
            "practical_marks": m.practical_marks,
            "total_obtained": m.total_obtained,
            "max_marks": ex.total_marks,
            "letter_grade": m.letter_grade,
            "grade_point": m.grade_point,
            "is_pass": m.is_pass
        })

    return {
        "college_info": {
            "name": "AKLANK GIRLS P.G. COLLEGE",
            "tagline": "Quality Education & Self-Reliance (Est. 1998)",
            "address": "Basant Vihar, Kota (Rajasthan) - 324009",
            "affiliation": "Affiliated to University of Kota (UOK) | Recognized by Govt. of Rajasthan",
            "contact": "0744-2405620 | exam@aklankcollege.ac.in"
        },
        "student_info": {
            "student_id": u.id if u else student_id,
            "student_name": sp.student_name if (sp and sp.student_name) else (u.full_name if u else "Student"),
            "father_name": sp.father_name if sp else "-",
            "scholar_no": sp.roll_number if sp else "-",
            "reg_no": sp.reg_no if sp else "-",
            "class_name": sp.class_name if sp else "B.A. I-SEM",
            "course": sp.department if sp else "General",
            "semester": semester,
            "session_year": session_year
        },
        "result_summary": {
            "total_credits": summary.total_credits,
            "total_max_marks": summary.total_max_marks,
            "total_obtained_marks": summary.total_obtained_marks,
            "percentage": summary.percentage,
            "sgpa": summary.sgpa,
            "cgpa": summary.cgpa,
            "letter_grade": summary.letter_grade,
            "division": summary.division,
            "result_status": summary.result_status.value if hasattr(summary.result_status, "value") else str(summary.result_status),
            "college_rank": summary.college_rank or 1,
            "class_rank": summary.class_rank or 1,
            "qr_token": summary.qr_token
        },
        "subject_marks": subject_rows
    }


@router.get("/student/results/{student_id}")
def get_student_results_portal(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student Portal Examination & Results Payload."""
    if current_user.role == UserRole.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    summaries = db.query(ResultSummary).filter(ResultSummary.student_id == student_id).order_by(ResultSummary.semester.asc()).all()
    backlogs = db.query(BacklogHistory, Subject).join(Subject, BacklogHistory.subject_id == Subject.id).filter(BacklogHistory.student_id == student_id).all()

    return {
        "summaries": [{
            "semester": s.semester,
            "session_year": s.session_year,
            "percentage": s.percentage,
            "sgpa": s.sgpa,
            "cgpa": s.cgpa,
            "letter_grade": s.letter_grade,
            "division": s.division,
            "status": s.result_status.value if hasattr(s.result_status, "value") else str(s.result_status),
            "class_rank": s.class_rank or 1
        } for s in summaries],
        "backlogs": [{
            "subject_name": sub.name,
            "semester": b.semester,
            "failed_date": b.failed_date.strftime("%d-%m-%Y"),
            "is_cleared": b.is_cleared,
            "attempts": b.attempts
        } for b, sub in backlogs]
    }


@router.get("/admin/dashboard")
def get_admin_exam_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Admin Exam Command Center Metrics, Rankers & AI Analytics."""
    seed_default_grade_system(db)
    total_exams = db.query(ExamSchedule).count()
    total_results = db.query(ResultSummary).count()

    pass_cnt = db.query(ResultSummary).filter(ResultSummary.result_status == ResultStatus.PASS).count()
    fail_cnt = db.query(ResultSummary).filter(ResultSummary.result_status == ResultStatus.FAIL).count()
    atkt_cnt = db.query(ResultSummary).filter(ResultSummary.result_status == ResultStatus.ATKT).count()

    pass_pct = round((pass_cnt / total_results * 100.0), 1) if total_results > 0 else 100.0

    # Top Rankers List
    top_rankers = db.query(ResultSummary, User, StudentProfile)\
        .join(User, ResultSummary.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
        .order_by(desc(ResultSummary.percentage)).limit(10).all()

    rankers_list = [{
        "rank": res.class_rank or 1,
        "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
        "scholar_no": sp.roll_number if sp else None,
        "class_name": sp.class_name if sp else None,
        "percentage": res.percentage,
        "sgpa": res.sgpa,
        "cgpa": res.cgpa
    } for res, u, sp in top_rankers]

    # AI At-Risk Prediction (Students with SGPA < 5.0 or Fail)
    at_risk = db.query(ResultSummary, User, StudentProfile)\
        .join(User, ResultSummary.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
        .filter(or_(ResultSummary.result_status == ResultStatus.FAIL, ResultSummary.sgpa < 5.0)).limit(10).all()

    at_risk_list = [{
        "student_id": u.id,
        "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
        "scholar_no": sp.roll_number if sp else None,
        "sgpa": res.sgpa,
        "risk_level": "HIGH RISK" if res.result_status == ResultStatus.FAIL else "MEDIUM RISK"
    } for res, u, sp in at_risk]

    return {
        "total_exams": total_exams,
        "total_results": total_results,
        "pass_count": pass_cnt,
        "fail_count": fail_cnt,
        "atkt_count": atkt_cnt,
        "pass_percentage": pass_pct,
        "top_rankers": rankers_list,
        "at_risk_students": at_risk_list
    }


@router.get("/reports/{report_type}")
def get_exam_reports(
    report_type: str,
    class_name: Optional[str] = None,
    semester: Optional[int] = None,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 15: Financial & Academic Exam Reports Engine.
    Generates Subject Result Register, Merit List, Backlog Report, Rank List, CGPA Register.
    """
    if report_type == "merit-list":
        results = db.query(ResultSummary, User, StudentProfile)\
            .join(User, ResultSummary.student_id == User.id)\
            .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
            .order_by(desc(ResultSummary.percentage)).limit(50).all()
        return {
            "report_title": "College Merit Rank List & Toppers Register",
            "count": len(results),
            "records": [{
                "rank": res.class_rank or i+1,
                "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
                "scholar_no": sp.roll_number if sp else None,
                "class_name": sp.class_name if sp else None,
                "percentage": res.percentage,
                "sgpa": res.sgpa,
                "cgpa": res.cgpa,
                "division": res.division
            } for i, (res, u, sp) in enumerate(results)]
        }

    elif report_type == "backlog-report":
        records = db.query(BacklogHistory, User, Subject)\
            .join(User, BacklogHistory.student_id == User.id)\
            .join(Subject, BacklogHistory.subject_id == Subject.id)\
            .filter(BacklogHistory.is_cleared == False).all()
        return {
            "report_title": "Backlog & Reappear Subject Register",
            "count": len(records),
            "records": [{
                "student_name": u.full_name,
                "subject_name": sub.name,
                "semester": b.semester,
                "failed_date": b.failed_date.strftime("%d-%m-%Y"),
                "attempts": b.attempts
            } for b, u, sub in records]
        }

    else:
        raise HTTPException(status_code=400, detail="Unsupported exam report type")
