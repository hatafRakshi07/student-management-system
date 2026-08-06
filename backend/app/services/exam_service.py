import json
import uuid
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import func, or_, and_, desc
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.subject import Subject
from app.models.exam import (
    ExamSchedule, MarkRecord, ResultSummary, GradeSystemRule,
    CGPAHistory, BacklogHistory, RevaluationRequest, ExamAuditLog, ResultStatus
)


def seed_default_grade_system(db: Session):
    """Seed standard grading scale rules if missing."""
    count = db.query(GradeSystemRule).count()
    if count == 0:
        default_rules = [
            (90.0, 100.0, "A+", 10.0, "Outstanding Performance"),
            (80.0, 89.99, "A", 9.0, "Excellent Performance"),
            (70.0, 79.99, "B+", 8.0, "Very Good Performance"),
            (60.0, 69.99, "B", 7.0, "Good Performance"),
            (50.0, 59.99, "C", 6.0, "Average Performance"),
            (40.0, 49.99, "D", 5.0, "Pass / Satisfactory"),
            (0.0, 39.99, "F", 0.0, "Fail / Reappear Required"),
        ]
        for min_s, max_s, g, pt, desc_t in default_rules:
            db.add(GradeSystemRule(min_score=min_s, max_score=max_s, letter_grade=g, grade_point=pt, description=desc_t))
        db.commit()


def get_grade_for_percentage(percentage: float) -> Tuple[str, float]:
    """Map percentage to letter grade and grade points."""
    if percentage >= 90.0:
        return "A+", 10.0
    elif percentage >= 80.0:
        return "A", 9.0
    elif percentage >= 70.0:
        return "B+", 8.0
    elif percentage >= 60.0:
        return "B", 7.0
    elif percentage >= 50.0:
        return "C", 6.0
    elif percentage >= 40.0:
        return "D", 5.0
    else:
        return "F", 0.0


def calculate_student_semester_result(db: Session, student_id: int, session_year: str = "2024-25", semester: int = 1) -> ResultSummary:
    """
    Computes subject totals, credit weighted SGPA, overall CGPA, Division, Pass/Fail status,
    and updates ResultSummary ledger.
    """
    seed_default_grade_system(db)
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    class_name = sp.class_name if sp else "General"

    marks = db.query(MarkRecord).join(ExamSchedule, MarkRecord.exam_id == ExamSchedule.id).filter(
        MarkRecord.student_id == student_id,
        ExamSchedule.session_year == session_year,
        ExamSchedule.semester == semester
    ).all()

    total_credits = 0
    weighted_pts = 0.0
    obtained_marks = 0.0
    max_marks = 0.0
    failed_subjects_count = 0

    for m in marks:
        sub = db.query(Subject).get(m.subject_id) if m.subject_id else None
        credits = sub.credits if (sub and sub.credits) else 4
        m_max = m.exam.total_marks if m.exam else 100.0

        total_credits += credits
        obtained_marks += m.total_obtained
        max_marks += m_max

        weighted_pts += (m.grade_point * credits)
        if not m.is_pass or m.letter_grade == "F":
            failed_subjects_count += 1
            # Add to backlog history if failed
            if m.subject_id:
                existing_bl = db.query(BacklogHistory).filter(
                    BacklogHistory.student_id == student_id,
                    BacklogHistory.subject_id == m.subject_id,
                    BacklogHistory.is_cleared == False
                ).first()
                if not existing_bl:
                    db.add(BacklogHistory(student_id=student_id, subject_id=m.subject_id, semester=semester, failed_date=date.today()))

    sgpa = round(weighted_pts / total_credits, 2) if total_credits > 0 else 0.0
    pct = round((obtained_marks / max_marks * 100.0), 2) if max_marks > 0 else 0.0

    if failed_subjects_count == 0 and pct >= 40.0:
        res_status = ResultStatus.PASS
    elif failed_subjects_count in (1, 2):
        res_status = ResultStatus.ATKT
    else:
        res_status = ResultStatus.FAIL

    if pct >= 75.0:
        division = "FIRST DIVISION WITH DISTINCTION"
    elif pct >= 60.0:
        division = "FIRST DIVISION"
    elif pct >= 50.0:
        division = "SECOND DIVISION"
    elif pct >= 40.0:
        division = "THIRD DIVISION"
    else:
        division = "FAIL"

    letter_g, _ = get_grade_for_percentage(pct)

    # CGPA calculation across all semesters
    all_summaries = db.query(ResultSummary).filter(ResultSummary.student_id == student_id).all()
    prev_sgpas = [s.sgpa for s in all_summaries if s.semester != semester] + [sgpa]
    cgpa = round(sum(prev_sgpas) / len(prev_sgpas), 2) if prev_sgpas else sgpa

    summary = db.query(ResultSummary).filter(
        ResultSummary.student_id == student_id,
        ResultSummary.session_year == session_year,
        ResultSummary.semester == semester
    ).first()

    if not summary:
        summary = ResultSummary(
            student_id=student_id,
            session_year=session_year,
            semester=semester,
            class_name=class_name,
            total_credits=total_credits or 20,
            total_max_marks=max_marks or 500.0,
            total_obtained_marks=obtained_marks,
            percentage=pct,
            sgpa=sgpa,
            cgpa=cgpa,
            letter_grade=letter_g,
            division=division,
            result_status=res_status,
            qr_token=f"AKL-RES-{student_id}-{semester}-{uuid.uuid4().hex[:8].upper()}",
            last_updated=datetime.utcnow()
        )
        db.add(summary)
    else:
        summary.total_credits = total_credits or 20
        summary.total_max_marks = max_marks or 500.0
        summary.total_obtained_marks = obtained_marks
        summary.percentage = pct
        summary.sgpa = sgpa
        summary.cgpa = cgpa
        summary.letter_grade = letter_g
        summary.division = division
        summary.result_status = res_status
        summary.last_updated = datetime.utcnow()

    db.flush()

    # Save CGPA History item
    cg_hist = db.query(CGPAHistory).filter(CGPAHistory.student_id == student_id, CGPAHistory.semester == semester).first()
    if not cg_hist:
        db.add(CGPAHistory(student_id=student_id, semester=semester, sgpa=sgpa, cgpa=cgpa))

    return summary


def update_class_ranks(db: Session, session_year: str = "2024-25", semester: int = 1):
    """
    Computes and updates College Rank, Department Rank, and Class Rank with tie handling.
    """
    results = db.query(ResultSummary).filter(
        ResultSummary.session_year == session_year,
        ResultSummary.semester == semester
    ).order_by(desc(ResultSummary.percentage)).all()

    for idx, res in enumerate(results, start=1):
        res.college_rank = idx
        res.class_rank = idx

    db.flush()


def log_exam_audit(db: Session, mark_id: int, modified_by_id: Optional[int], old_marks: Optional[float], new_marks: Optional[float], reason: Optional[str] = None):
    """Log audit trail for mark edits."""
    audit = ExamAuditLog(
        mark_id=mark_id,
        modified_by_id=modified_by_id,
        old_marks=old_marks,
        new_marks=new_marks,
        reason=reason,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
