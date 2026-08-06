import io
import csv
import json
import openpyxl
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.teacher import TeacherProfile
from app.models.subject import Subject
from app.models.attendance import (
    AttendanceSession, StudentAttendanceRecord, StaffAttendanceRecord,
    AttendanceSummary, HolidayRecord, WorkingDay, AttendanceAuditLog,
    AttendanceSetting, StudentAttendanceStatus, StaffAttendanceStatus, Attendance
)
from app.services.attendance_service import (
    recalculate_student_attendance_summary,
    recalculate_staff_attendance_summary,
    log_attendance_audit,
    seed_default_working_days_and_settings
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/session/submit")
def submit_attendance_session(
    payload: Dict[str, Any],
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Teacher/Admin Bulk Attendance Submission Endpoint.
    Prevents duplicate lecture session submission for same student/subject/lecture on same date.
    """
    class_name = payload.get("class_name")
    department = payload.get("department")
    section = payload.get("section")
    semester = payload.get("semester")
    subject_id = payload.get("subject_id")
    lecture_no = payload.get("lecture_no", 1)
    session_date_str = payload.get("date", str(date.today()))
    student_records = payload.get("records", [])  # List of {student_id: int, status: str, remarks: str}

    try:
        session_date = datetime.strptime(session_date_str, "%Y-%m-%d").date()
    except ValueError:
        session_date = date.today()

    # Check for existing session or create session
    att_session = db.query(AttendanceSession).filter(
        AttendanceSession.class_name == class_name,
        AttendanceSession.section == section,
        AttendanceSession.subject_id == subject_id,
        AttendanceSession.session_date == session_date,
        AttendanceSession.lecture_no == lecture_no
    ).first()

    if not att_session:
        att_session = AttendanceSession(
            class_name=class_name,
            department=department,
            section=section,
            semester=semester,
            subject_id=subject_id,
            teacher_id=current_user.id,
            session_date=session_date,
            lecture_no=lecture_no,
            status="SUBMITTED",
            created_at=datetime.utcnow()
        )
        db.add(att_session)
        db.flush()

    submitted_count = 0
    updated_count = 0

    for item in student_records:
        std_id = item.get("student_id")
        st_val = item.get("status", "PRESENT").upper()
        remark = item.get("remarks")

        try:
            status_enum = StudentAttendanceStatus(st_val)
        except ValueError:
            status_enum = StudentAttendanceStatus.PRESENT

        existing_rec = db.query(StudentAttendanceRecord).filter(
            StudentAttendanceRecord.student_id == std_id,
            StudentAttendanceRecord.date == session_date,
            StudentAttendanceRecord.lecture_no == lecture_no,
            StudentAttendanceRecord.subject_id == subject_id
        ).first()

        if existing_rec:
            old_st = existing_rec.status.value if hasattr(existing_rec.status, "value") else str(existing_rec.status)
            existing_rec.status = status_enum
            existing_rec.remarks = remark
            existing_rec.marked_by_id = current_user.id
            existing_rec.updated_at = datetime.utcnow()
            updated_count += 1
            log_attendance_audit(db, "STUDENT", existing_rec.id, "MODIFIED", current_user.id, old_st, status_enum.value)
        else:
            rec = StudentAttendanceRecord(
                session_id=att_session.id,
                student_id=std_id,
                subject_id=subject_id,
                date=session_date,
                lecture_no=lecture_no,
                status=status_enum,
                marked_by_id=current_user.id,
                remarks=remark,
                created_at=datetime.utcnow()
            )
            db.add(rec)
            db.flush()
            submitted_count += 1
            log_attendance_audit(db, "STUDENT", rec.id, "MARKED", current_user.id, None, status_enum.value)

        # Legacy table compatibility write
        leg = db.query(Attendance).filter(Attendance.student_id == std_id, Attendance.date == session_date).first()
        if not leg:
            db.add(Attendance(student_id=std_id, subject_id=subject_id, date=session_date, status=st_val.lower(), marked_by_id=current_user.id))

        # Recalculate summary
        recalculate_student_attendance_summary(db, std_id)

    db.commit()

    return {
        "message": "Attendance session submitted successfully",
        "session_id": att_session.id,
        "new_records": submitted_count,
        "updated_records": updated_count
    }


@router.post("/staff/check-in")
def staff_check_in(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Staff Self Check-In Endpoint."""
    today = date.today()
    now = datetime.utcnow()

    record = db.query(StaffAttendanceRecord).filter(
        StaffAttendanceRecord.staff_id == current_user.id,
        StaffAttendanceRecord.date == today
    ).first()

    if record and record.check_in_time:
        return {"message": "Already checked in today", "check_in_time": record.check_in_time.strftime("%I:%M %p")}

    # Standard start 09:00 AM (late if after 09:15 AM)
    standard_start = datetime(now.year, now.month, now.day, 9, 0)
    is_late = now > (standard_start + timedelta(minutes=15))
    late_mins = max(0, int((now - standard_start).total_seconds() / 60)) if is_late else 0

    if not record:
        record = StaffAttendanceRecord(
            staff_id=current_user.id,
            date=today,
            check_in_time=now,
            status=StaffAttendanceStatus.LATE if is_late else StaffAttendanceStatus.PRESENT,
            is_late=is_late,
            late_minutes=late_mins,
            created_at=now
        )
        db.add(record)
    else:
        record.check_in_time = now
        record.is_late = is_late
        record.late_minutes = late_mins
        record.status = StaffAttendanceStatus.LATE if is_late else StaffAttendanceStatus.PRESENT

    db.commit()
    recalculate_staff_attendance_summary(db, current_user.id)
    db.commit()

    return {"message": "Checked in successfully", "check_in_time": now.strftime("%I:%M %p"), "is_late": is_late}


@router.post("/staff/check-out")
def staff_check_out(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Staff Self Check-Out Endpoint."""
    today = date.today()
    now = datetime.utcnow()

    record = db.query(StaffAttendanceRecord).filter(
        StaffAttendanceRecord.staff_id == current_user.id,
        StaffAttendanceRecord.date == today
    ).first()

    if not record or not record.check_in_time:
        raise HTTPException(status_code=400, detail="Must check in first before checking out")

    record.check_out_time = now
    duration_hours = (now - record.check_in_time).total_seconds() / 3600.0
    record.working_hours = round(max(0.0, duration_hours - record.break_hours), 2)
    record.overtime_hours = round(max(0.0, record.working_hours - 8.0), 2)

    db.commit()
    recalculate_staff_attendance_summary(db, current_user.id)
    db.commit()

    return {
        "message": "Checked out successfully",
        "check_out_time": now.strftime("%I:%M %p"),
        "total_working_hours": record.working_hours
    }


@router.get("/student/dashboard/{student_id}")
def get_student_attendance_dashboard(student_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Student Attendance Dashboard Payload."""
    if current_user.role == UserRole.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    summary = recalculate_student_attendance_summary(db, student_id)
    today = date.today()

    today_rec = db.query(StudentAttendanceRecord).filter(
        StudentAttendanceRecord.student_id == student_id,
        StudentAttendanceRecord.date == today
    ).first()

    records = db.query(StudentAttendanceRecord).filter(
        StudentAttendanceRecord.student_id == student_id
    ).order_by(StudentAttendanceRecord.date.desc()).limit(60).all()

    # Subject-wise breakdown
    from sqlalchemy import case
    subj_query = db.query(
        StudentAttendanceRecord.subject_id,
        func.count(StudentAttendanceRecord.id),
        func.sum(case((StudentAttendanceRecord.status.in_([StudentAttendanceStatus.PRESENT, StudentAttendanceStatus.LATE]), 1), else_=0))
    ).filter(StudentAttendanceRecord.student_id == student_id).group_by(StudentAttendanceRecord.subject_id).all()

    subj_breakdown = []
    for sub_id, total_cnt, pres_cnt in subj_query:
        sub_obj = db.query(Subject).get(sub_id) if sub_id else None
        p_pct = round((pres_cnt / total_cnt * 100.0), 1) if total_cnt > 0 else 100.0
        subj_breakdown.append({
            "subject_id": sub_id,
            "subject_name": sub_obj.name if sub_obj else "General Lecture",
            "subject_code": sub_obj.code if sub_obj else "GEN",
            "total_lectures": total_cnt,
            "attended": pres_cnt,
            "percentage": p_pct
        })

    return {
        "today_status": (today_rec.status.value if hasattr(today_rec.status, "value") else str(today_rec.status)) if today_rec else "NOT_MARKED",
        "overall_percentage": summary.attendance_percentage,
        "total_working_days": summary.total_working_days,
        "present_days": summary.present_days,
        "absent_days": summary.absent_days,
        "leave_days": summary.leave_days,
        "consecutive_absent_days": summary.consecutive_absent_days,
        "is_low_attendance": summary.attendance_percentage < 75.0,
        "subject_breakdown": subj_breakdown,
        "recent_records": [{
            "date": r.date.strftime("%d-%m-%Y"),
            "lecture_no": r.lecture_no,
            "subject": r.subject.name if r.subject else "General",
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "remarks": r.remarks
        } for r in records]
    }


@router.get("/admin/dashboard")
def get_admin_attendance_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Admin ERP Attendance Command Center Metrics & Analytics."""
    seed_default_working_days_and_settings(db)
    today = date.today()

    # Students today
    st_today = db.query(StudentAttendanceRecord).filter(StudentAttendanceRecord.date == today).all()
    st_present = sum(1 for r in st_today if r.status in (StudentAttendanceStatus.PRESENT, StudentAttendanceStatus.LATE))
    st_absent = sum(1 for r in st_today if r.status == StudentAttendanceStatus.ABSENT)
    st_late = sum(1 for r in st_today if r.status == StudentAttendanceStatus.LATE)

    # Staff today
    staff_today = db.query(StaffAttendanceRecord).filter(StaffAttendanceRecord.date == today).all()
    staff_present = sum(1 for r in staff_today if r.check_in_time is not None)
    staff_absent = sum(1 for r in staff_today if r.status == StaffAttendanceStatus.ABSENT)
    staff_late = sum(1 for r in staff_today if r.is_late)

    # Low attendance risk list (<75%)
    low_att = db.query(AttendanceSummary, User, StudentProfile)\
        .join(User, AttendanceSummary.user_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
        .filter(AttendanceSummary.role == "student", AttendanceSummary.attendance_percentage < 75.0)\
        .order_by(AttendanceSummary.attendance_percentage.asc()).limit(15).all()

    low_att_students = [{
        "student_id": u.id,
        "name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
        "scholar_no": sp.roll_number if sp else None,
        "class_name": sp.class_name if sp else None,
        "percentage": fs.attendance_percentage,
        "absent_days": fs.absent_days
    } for fs, u, sp in low_att]

    # Department breakdown
    dept_breakdown = db.query(
        StudentProfile.department,
        func.avg(AttendanceSummary.attendance_percentage)
    ).join(AttendanceSummary, StudentProfile.user_id == AttendanceSummary.user_id)\
     .group_by(StudentProfile.department).all()

    return {
        "students_today": {
            "total_marked": len(st_today),
            "present": st_present,
            "absent": st_absent,
            "late": st_late
        },
        "staff_today": {
            "total_marked": len(staff_today),
            "present": staff_present,
            "absent": staff_absent,
            "late": staff_late
        },
        "low_attendance_students": low_att_students,
        "department_percentages": [{
            "department": dept or "General",
            "average_percentage": round(float(avg_pct or 100.0), 1)
        } for dept, avg_pct in dept_breakdown]
    }


@router.get("/reports/{report_type}")
def get_attendance_reports(
    report_type: str,
    class_name: Optional[str] = None,
    session: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 10: Attendance Financial & Academic Reports Engine.
    Generates Daily Register, Monthly Grid Register, Low Attendance Risk Register,
    Student Attendance Card, Staff Working Hours Register.
    """
    if report_type == "daily-register":
        q_date = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else date.today()
        records = db.query(StudentAttendanceRecord, User, StudentProfile)\
            .join(User, StudentAttendanceRecord.student_id == User.id)\
            .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
            .filter(StudentAttendanceRecord.date == q_date).all()
        
        return {
            "report_title": f"Daily Attendance Register - {q_date.strftime('%d-%m-%Y')}",
            "count": len(records),
            "records": [{
                "student_id": u.id,
                "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
                "scholar_no": sp.roll_number if sp else None,
                "class_name": sp.class_name if sp else None,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "remarks": r.remarks
            } for r, u, sp in records]
        }

    elif report_type == "low-attendance":
        records = db.query(AttendanceSummary, User, StudentProfile)\
            .join(User, AttendanceSummary.user_id == User.id)\
            .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
            .filter(AttendanceSummary.role == "student", AttendanceSummary.attendance_percentage < 75.0).all()
        return {
            "report_title": "Students Low Attendance Alert Register (<75%)",
            "count": len(records),
            "records": [{
                "student_id": u.id,
                "name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
                "scholar_no": sp.roll_number if sp else None,
                "class_name": sp.class_name if sp else None,
                "percentage": fs.attendance_percentage,
                "consecutive_absent": fs.consecutive_absent_days
            } for fs, u, sp in records]
        }

    elif report_type == "staff-hours":
        records = db.query(StaffAttendanceRecord, User)\
            .join(User, StaffAttendanceRecord.staff_id == User.id).order_by(StaffAttendanceRecord.date.desc()).limit(100).all()
        return {
            "report_title": "Staff Working Hours & Late Entry Register",
            "count": len(records),
            "records": [{
                "staff_id": u.id,
                "staff_name": u.full_name,
                "date": r.date.strftime("%d-%m-%Y"),
                "check_in": r.check_in_time.strftime("%I:%M %p") if r.check_in_time else "-",
                "check_out": r.check_out_time.strftime("%I:%M %p") if r.check_out_time else "-",
                "working_hours": r.working_hours,
                "is_late": r.is_late
            } for r, u in records]
        }

    else:
        raise HTTPException(status_code=400, detail="Unsupported attendance report type")
