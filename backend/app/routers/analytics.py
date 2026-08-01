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
    total_students = db.query(func.count(User.id)).filter(
        User.role == UserRole.student, User.is_active == True
    ).scalar() or 0
    total_teachers = db.query(func.count(User.id)).filter(
        User.role == UserRole.teacher, User.is_active == True
    ).scalar() or 0
    total_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.is_active == True
    ).scalar() or 0

    total_att = db.query(func.count(Attendance.id)).scalar() or 0
    present_count = db.query(func.count(Attendance.id)).filter(
        Attendance.status == AttendanceStatus.present
    ).scalar() or 0
    att_pct = round((present_count / total_att) * 100, 2) if total_att > 0 else 0.0

    total_fee = float(db.query(func.coalesce(func.sum(Fee.amount), 0.0)).scalar() or 0.0)
    paid_fee = float(
        db.query(func.coalesce(func.sum(Fee.amount), 0.0))
        .filter(Fee.status == FeeStatus.paid)
        .scalar() or 0.0
    )

    grade_results = (
        db.query(
            func.coalesce(Mark.grade, "N/A").label("grade"),
            func.count(Mark.id).label("count"),
        )
        .group_by(func.coalesce(Mark.grade, "N/A"))
        .all()
    )
    grade_dist = {r.grade: r.count for r in grade_results}

    return {
        "total_students": total_students, "total_teachers": total_teachers,
        "total_assignments": total_assignments,
        "attendance_percentage": att_pct,
        "total_fee_amount": total_fee, "paid_fee_amount": paid_fee,
        "pending_fee_amount": total_fee - paid_fee,
        "grade_distribution": grade_dist,
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
        Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]),
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
                (Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]), 1),
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
                (Attendance.status.in_([AttendanceStatus.present, AttendanceStatus.late]), 1),
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
            "pass_rate":      round(float(r.pass_count or 0) / r.total_students * 100, 1),
        }
        for r in rows
    ]

    avgs         = np.array([s["avg_marks"] for s in subjects])
    overall_avg  = float(round(avgs.mean(), 2))
    std_dev      = float(avgs.std())

    for s in subjects:
        s["is_weak_subject"] = bool(s["avg_marks"] < overall_avg - std_dev)

    return {"subjects": subjects, "overall_avg": overall_avg}

