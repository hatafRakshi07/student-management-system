import json
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.teacher import TeacherProfile
from app.models.attendance import (
    AttendanceSession, StudentAttendanceRecord, StaffAttendanceRecord,
    AttendanceSummary, HolidayRecord, WorkingDay, AttendanceAuditLog,
    AttendanceSetting, StudentAttendanceStatus, StaffAttendanceStatus
)


def seed_default_working_days_and_settings(db: Session):
    """Seed default 6 working days (Monday-Saturday) and default attendance settings if missing."""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    for d in days:
        existing = db.query(WorkingDay).filter(WorkingDay.day_name == d).first()
        if not existing:
            db.add(WorkingDay(day_name=d, is_working=True))
    
    sun = db.query(WorkingDay).filter(WorkingDay.day_name == "Sunday").first()
    if not sun:
        db.add(WorkingDay(day_name="Sunday", is_working=False))

    setting = db.query(AttendanceSetting).first()
    if not setting:
        db.add(AttendanceSetting(low_attendance_threshold=75.0, staff_work_hours_standard=8.0, grace_period_minutes=15))
    
    db.commit()


def recalculate_student_attendance_summary(db: Session, student_id: int) -> AttendanceSummary:
    """
    Recalculate student attendance percentage, present days, absent days, leave days,
    working days, and consecutive absent days, excluding defined holidays.
    """
    holidays = {h.date for h in db.query(HolidayRecord.date).all()}
    records = db.query(StudentAttendanceRecord).filter(
        StudentAttendanceRecord.student_id == student_id,
        ~StudentAttendanceRecord.date.in_(holidays)
    ).order_by(StudentAttendanceRecord.date.asc()).all()

    total_sessions = len(records)
    present_cnt = 0
    absent_cnt = 0
    leave_cnt = 0
    late_cnt = 0
    half_cnt = 0
    consecutive_absent = 0
    current_consecutive = 0

    for r in records:
        st = r.status.value if hasattr(r.status, "value") else str(r.status)
        if st in ("PRESENT", "present"):
            present_cnt += 1
            current_consecutive = 0
        elif st in ("ABSENT", "absent"):
            absent_cnt += 1
            current_consecutive += 1
            if current_consecutive > consecutive_absent:
                consecutive_absent = current_consecutive
        elif st in ("LATE", "late"):
            late_cnt += 1
            present_cnt += 1
            current_consecutive = 0
        elif st in ("HALF_DAY", "half_day"):
            half_cnt += 1
            present_cnt += 0.5
            current_consecutive = 0
        elif st in ("LEAVE", "MEDICAL_LEAVE", "leave", "excused"):
            leave_cnt += 1
            current_consecutive = 0

    pct = round((present_cnt / total_sessions * 100.0), 2) if total_sessions > 0 else 100.0

    summary = db.query(AttendanceSummary).filter(AttendanceSummary.user_id == student_id).first()
    if not summary:
        summary = AttendanceSummary(
            user_id=student_id,
            role="student",
            total_working_days=total_sessions,
            present_days=present_cnt,
            absent_days=absent_cnt,
            leave_days=leave_cnt,
            late_days=late_cnt,
            half_days=half_cnt,
            consecutive_absent_days=consecutive_absent,
            attendance_percentage=pct,
            last_updated=datetime.utcnow()
        )
        db.add(summary)
    else:
        summary.total_working_days = total_sessions
        summary.present_days = present_cnt
        summary.absent_days = absent_cnt
        summary.leave_days = leave_cnt
        summary.late_days = late_cnt
        summary.half_days = half_cnt
        summary.consecutive_absent_days = consecutive_absent
        summary.attendance_percentage = pct
        summary.last_updated = datetime.utcnow()

    db.flush()
    return summary


def recalculate_staff_attendance_summary(db: Session, staff_id: int) -> AttendanceSummary:
    """
    Recalculate staff working hours, present days, late entries, and absent days.
    """
    records = db.query(StaffAttendanceRecord).filter(StaffAttendanceRecord.staff_id == staff_id).all()
    total_days = len(records)
    present_cnt = sum(1 for r in records if r.status in (StaffAttendanceStatus.PRESENT, "PRESENT"))
    absent_cnt = sum(1 for r in records if r.status in (StaffAttendanceStatus.ABSENT, "ABSENT"))
    late_cnt = sum(1 for r in records if r.is_late)
    total_hours = sum(r.working_hours or 0.0 for r in records)

    pct = round((present_cnt / total_days * 100.0), 2) if total_days > 0 else 100.0

    summary = db.query(AttendanceSummary).filter(AttendanceSummary.user_id == staff_id).first()
    if not summary:
        summary = AttendanceSummary(
            user_id=staff_id,
            role="staff",
            total_working_days=total_days,
            present_days=present_cnt,
            absent_days=absent_cnt,
            late_days=late_cnt,
            total_working_hours=round(total_hours, 2),
            attendance_percentage=pct,
            last_updated=datetime.utcnow()
        )
        db.add(summary)
    else:
        summary.total_working_days = total_days
        summary.present_days = present_cnt
        summary.absent_days = absent_cnt
        summary.late_days = late_cnt
        summary.total_working_hours = round(total_hours, 2)
        summary.attendance_percentage = pct
        summary.last_updated = datetime.utcnow()

    db.flush()
    return summary


def log_attendance_audit(db: Session, entity_type: str, record_id: int, action: str, modified_by_id: Optional[int], old_status: Optional[str], new_status: Optional[str], ip_address: Optional[str] = None):
    """Log audit trail for attendance changes."""
    audit = AttendanceAuditLog(
        entity_type=entity_type,
        record_id=record_id,
        action=action,
        modified_by_id=modified_by_id,
        old_status=old_status,
        new_status=new_status,
        timestamp=datetime.utcnow(),
        ip_address=ip_address
    )
    db.add(audit)
