from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.database import get_db
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.models.exam import Exam, Mark
from app.models.fee import Fee, FeeStatus
from app.models.assignment import Assignment, Submission, SubmissionStatus
from app.models.subject import Subject
from app.utils.auth_deps import require_admin, require_teacher_or_admin

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
def admin_dashboard(_=Depends(require_admin), db: Session = Depends(get_db)):
    from app.models.student import StudentProfile, StudentAcademicHistory
    from app.models.fee import FeeReceipt, FeeSummary, FeeTransaction
    from app.models.teacher import TeacherProfile
    from datetime import datetime

    now = datetime.utcnow()

    total_students = db.query(func.count(User.id)).filter(
        User.role == UserRole.student
    ).scalar() or 0

    active_students = db.query(func.count(User.id)).filter(
        User.role == UserRole.student, User.is_active == True
    ).scalar() or total_students

    total_teachers = db.query(func.count(User.id)).filter(
        User.role == UserRole.teacher, User.is_active == True
    ).scalar() or 0

    total_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.is_active == True
    ).scalar() or 0

    total_courses = db.query(func.count(func.distinct(StudentProfile.department))).scalar() or 5

    # Multi-Year Enrollment Trend (2022 to 2026)
    sessions_order = ["2022-23", "2023-24", "2024-25", "2025-26"]
    session_counts = dict(
        db.query(StudentAcademicHistory.session, func.count(func.distinct(StudentAcademicHistory.student_id)))
        .group_by(StudentAcademicHistory.session).all()
    )

    enrollment_trend = []
    for s in sessions_order:
        enrollment_trend.append({
            "year": s,
            "session": s,
            "students": session_counts.get(s, 0)
        })

    # Class-wise & Course-wise breakdown
    class_wise_raw = db.query(StudentProfile.class_name, func.count(StudentProfile.id)).group_by(StudentProfile.class_name).all()
    course_wise_raw = db.query(StudentProfile.department, func.count(StudentProfile.id)).group_by(StudentProfile.department).all()

    course_distribution = [
        {"name": d or "General", "students": count}
        for d, count in course_wise_raw if d
    ]

    # Session-wise Fee Collection & Discounts
    session_fee_rows = db.query(
        FeeReceipt.session,
        func.coalesce(func.sum(FeeReceipt.amount), 0.0),
        func.coalesce(func.sum(FeeReceipt.discount), 0.0),
        func.count(FeeReceipt.receipt_id)
    ).group_by(FeeReceipt.session).all()

    session_fee_map = {row[0]: {"paid": float(row[1]), "discount": float(row[2]), "receipts": int(row[3])} for row in session_fee_rows if row[0]}

    session_fee_trend = []
    for s in sessions_order:
        data = session_fee_map.get(s, {"paid": 0.0, "discount": 0.0, "receipts": 0})
        # Estimate pending for session
        est_pending = max(0.0, data["paid"] * 0.15)
        session_fee_trend.append({
            "session": s,
            "paid": data["paid"],
            "discount": data["discount"],
            "pending": round(est_pending, 2),
            "receipts": data["receipts"]
        })

    # Total Overall Financials
    total_paid_fee = float(db.query(func.coalesce(func.sum(FeeReceipt.amount), 0.0)).scalar() or 0.0)
    total_discount_fee = float(db.query(func.coalesce(func.sum(FeeReceipt.discount), 0.0)).scalar() or 0.0)
    total_pending_fee = float(db.query(func.coalesce(func.sum(FeeSummary.pending_fee), 0.0)).scalar() or 0.0)
    total_gross_fee = float(db.query(func.coalesce(func.sum(FeeSummary.total_fee), 0.0)).scalar() or (total_paid_fee + total_pending_fee))

    collection_percentage = round((total_paid_fee / total_gross_fee * 100.0), 1) if total_gross_fee > 0 else 100.0

    # Payment Mode Breakdown
    mode_rows = db.query(
        FeeReceipt.payment_mode,
        func.coalesce(func.sum(FeeReceipt.amount), 0.0),
        func.count(FeeReceipt.receipt_id)
    ).group_by(FeeReceipt.payment_mode).all()

    mode_distribution = [
        {"mode": (m or "CASH").upper(), "amount": float(amt), "count": cnt}
        for m, amt, cnt in mode_rows if m
    ]

    # Monthly Collection History (Database-Agnostic for PostgreSQL & SQLite)
    monthly_trend_q = db.query(
        func.extract('year', FeeReceipt.receipt_date).label("yr"),
        func.extract('month', FeeReceipt.receipt_date).label("mo"),
        func.coalesce(func.sum(FeeReceipt.amount), 0.0),
        func.count(FeeReceipt.receipt_id)
    ).filter(FeeReceipt.receipt_date.isnot(None))\
     .group_by("yr", "mo").order_by("yr", "mo").all()

    monthly_collections = []
    for yr, mo, amt, cnt in monthly_trend_q:
        if yr and mo:
            ym = f"{int(yr):04d}-{int(mo):02d}"
            monthly_collections.append({
                "month": ym,
                "amount": float(amt),
                "transactions": cnt
            })


    # Recent Fee Payments (with resolved Student name & details)
    recent_receipts = (
        db.query(FeeReceipt, User, StudentProfile)
        .outerjoin(User, FeeReceipt.student_id == User.id)
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
        .order_by(FeeReceipt.receipt_date.desc(), FeeReceipt.receipt_id.desc())
        .limit(10).all()
    )

    recent_payments = []
    for r, u, sp in recent_receipts:
        recent_payments.append({
            "receipt_id": r.receipt_id,
            "receipt_no": r.receipt_no or r.voucher_no or str(r.receipt_id),
            "student_id": u.id if u else r.student_id,
            "student_name": (u.full_name if u else (sp.student_name if sp else "Student")),
            "scholar_no": sp.roll_number if sp else "-",
            "class_name": sp.class_name if sp else "-",
            "amount": r.amount,
            "discount": r.discount,
            "payment_mode": r.payment_mode or "CASH",
            "session": r.session or "2025-26",
            "date": r.receipt_date.strftime("%d-%m-%Y") if r.receipt_date else "-"
        })

    # Top Defaulters / Pending Students
    defaulters_q = (
        db.query(FeeSummary, User, StudentProfile)
        .join(User, FeeSummary.student_id == User.id)
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
        .filter(FeeSummary.pending_fee > 0)
        .order_by(FeeSummary.pending_fee.desc())
        .limit(10).all()
    )

    top_defaulters = []
    for fs, u, sp in defaulters_q:
        top_defaulters.append({
            "student_id": u.id,
            "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "scholar_no": sp.roll_number if sp else "-",
            "class_name": sp.class_name if sp else "-",
            "mobile": u.phone or (sp.mobile if sp else "-"),
            "total_fee": fs.total_fee,
            "total_paid": fs.total_paid,
            "pending_fee": fs.pending_fee,
            "status": fs.current_status
        })

    return {
        # 8 Core KPIs
        "kpis": {
            "total_students": total_students,
            "active_students": active_students,
            "total_teachers": total_teachers,
            "total_courses": total_courses,
            "total_fee_collected": total_paid_fee,
            "total_pending_fee": total_pending_fee,
            "total_discount_fee": total_discount_fee,
            "collection_percentage": collection_percentage,
            "current_session": "2025-26"
        },
        # Legacy compatibility keys
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_assignments": total_assignments,
        "total_active_students": active_students,
        "paid_fees": total_paid_fee,
        "pending_fees": total_pending_fee,
        "collection_percentage": collection_percentage,
        # Rich Visualizations
        "enrollment_trend": enrollment_trend,
        "session_fee_trend": session_fee_trend,
        "course_distribution": course_distribution,
        "payment_mode_distribution": mode_distribution,
        "monthly_collections": monthly_collections[-18:] if len(monthly_collections) > 18 else monthly_collections,
        "recent_payments": recent_payments,
        "top_defaulters": top_defaulters,
        "class_wise_students": {c or "Unassigned": count for c, count in class_wise_raw},
        "course_wise_students": {d or "General": count for d, count in course_wise_raw},
        "session_wise_students": session_counts
    }




@router.get("/attendance-trend")
def attendance_trend(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    results = (db.query(Attendance.date, func.count(Attendance.id).label("total"))
               .group_by(Attendance.date).order_by(Attendance.date.desc()).limit(30).all())
    return {"trend": [{"date": str(r.date), "total": r.total} for r in results]}


@router.get("/student/{student_id}")
def student_analytics(student_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    total = db.query(func.count(Attendance.id)).filter(
        Attendance.student_id == student_id
    ).scalar() or 0
    present = db.query(func.count(Attendance.id)).filter(
        Attendance.student_id == student_id,
        Attendance.status.in_(["present", "late", "PRESENT", "LATE"]),
    ).scalar() or 0
    att_pct = round((present / total) * 100, 2) if total > 0 else 0.0

    avg_result = db.query(func.avg(Mark.marks_obtained)).filter(
        Mark.student_id == student_id
    ).scalar()
    avg_marks = round(float(avg_result), 2) if avg_result else 0.0

    total_subs = db.query(func.count(Submission.id)).filter(
        Submission.student_id == student_id
    ).scalar() or 0
    graded_subs = db.query(func.count(Submission.id)).filter(
        Submission.student_id == student_id,
        Submission.status == SubmissionStatus.graded,
    ).scalar() or 0

    return {
        "attendance_percentage": att_pct, "total_classes": total, "present": present,
        "average_marks": avg_marks, "total_submissions": total_subs,
        "graded_submissions": graded_subs,
    }


# ── Data Science endpoints ───────────────────────────────────────────────────────

@router.get("/attendance-forecast")
def attendance_forecast(
    days_ahead: int = 7,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    Exponential Smoothing forecast — predicts attendance % for next `days_ahead` days.
    Uses last 60 days of actual data as the input series.
    """
    from app.services.ml_service import forecast_attendance_trend

    rows = (
        db.query(
            Attendance.date,
            func.count(Attendance.id).label("total"),
            func.sum(case(
                (Attendance.status.in_(["present", "late", "PRESENT", "LATE"]), 1),
                else_=0,
            )).label("present"),
        )
        .group_by(Attendance.date)
        .order_by(Attendance.date.asc())
        .limit(60)
        .all()
    )
    daily_data = [
        {"date": str(r.date), "total": r.total, "present": int(r.present or 0)}
        for r in rows
    ]
    return forecast_attendance_trend(daily_data, days_ahead=days_ahead)


@router.get("/student-clusters")
def student_clusters(
    n_clusters: int = 3,
    _=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    K-Means clustering — groups all active students into academic performance clusters.
    Returns centroid stats and per-cluster student lists.
    """
    from app.services.ml_service import cluster_students

    # Single SQL query — per-student attendance %, avg marks, assignment %
    total_assignments = (
        db.query(func.count(Assignment.id))
        .filter(Assignment.is_active == True)
        .scalar() or 0
    )

    att_sq = (
        db.query(
            Attendance.student_id.label("sid"),
            (func.sum(case(
                (Attendance.status.in_(["present", "late", "PRESENT", "LATE"]), 1),
                else_=0,
            )) * 100.0 / func.nullif(func.count(Attendance.id), 0)).label("att_pct"),
        )
        .group_by(Attendance.student_id)
        .subquery()
    )

    marks_sq = (
        db.query(
            Mark.student_id.label("sid"),
            func.avg(Mark.marks_obtained).label("avg_marks"),
        )
        .group_by(Mark.student_id)
        .subquery()
    )

    subs_sq = (
        db.query(
            Submission.student_id.label("sid"),
            func.count(Submission.id).label("sub_count"),
        )
        .group_by(Submission.student_id)
        .subquery()
    )

    rows = (
        db.query(
            User.id,
            User.full_name,
            func.coalesce(att_sq.c.att_pct, 0).label("att_pct"),
            func.coalesce(marks_sq.c.avg_marks, 0).label("avg_marks"),
            func.coalesce(subs_sq.c.sub_count, 0).label("sub_count"),
        )
        .outerjoin(att_sq,   User.id == att_sq.c.sid)
        .outerjoin(marks_sq, User.id == marks_sq.c.sid)
        .outerjoin(subs_sq,  User.id == subs_sq.c.sid)
        .filter(User.role == UserRole.student, User.is_active == True)
        .all()
    )

    features = [
        {
            "student_id":    r.id,
            "student_name":  r.full_name,
            "attendance_pct":  round(float(r.att_pct or 0), 2),
            "avg_marks":       round(float(r.avg_marks or 0), 2),
            "assignment_pct":  (
                round(float(r.sub_count or 0) / total_assignments * 100, 2)
                if total_assignments > 0 else 0.0
            ),
        }
        for r in rows
    ]
    return cluster_students(features, n_clusters=n_clusters)


@router.get("/subject-performance")
def subject_performance(
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    Subject-wise performance analysis — avg, min, max marks and pass rate per subject.
    Flags subjects where avg marks are more than 1 std-dev below overall mean (weak subjects).
    """
    import numpy as np

    rows = (
        db.query(
            Subject.name.label("subject"),
            Subject.code.label("code"),
            func.avg(Mark.marks_obtained).label("avg_marks"),
            func.min(Mark.marks_obtained).label("min_marks"),
            func.max(Mark.marks_obtained).label("max_marks"),
            func.count(Mark.id).label("total_students"),
            func.sum(case(
                (Mark.marks_obtained >= 40, 1),
                else_=0,
            )).label("pass_count"),
        )
        .join(Exam,    Exam.subject_id == Subject.id)
        .join(Mark,    Mark.exam_id    == Exam.id)
        .group_by(Subject.id, Subject.name, Subject.code)
        .all()
    )

    if not rows:
        return {"subjects": [], "overall_avg": 0.0}

    subjects = [
        {
            "subject":        r.subject,
            "code":           r.code,
            "avg_marks":      round(float(r.avg_marks), 2),
            "min_marks":      round(float(r.min_marks), 2),
            "max_marks":      round(float(r.max_marks), 2),
            "total_students": r.total_students,
            "pass_rate":      round(float(r.pass_count or 0) / r.total_students * 100, 1) if (r.total_students and r.total_students > 0) else 0.0,
        }
        for r in rows
    ]

    avgs         = np.array([s["avg_marks"] for s in subjects])
    overall_avg  = float(round(avgs.mean(), 2))
    std_dev      = float(avgs.std())

    for s in subjects:
        s["is_weak_subject"] = bool(s["avg_marks"] < overall_avg - std_dev)

    return {"subjects": subjects, "overall_avg": overall_avg}

