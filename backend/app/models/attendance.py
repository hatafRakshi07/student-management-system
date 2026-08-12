from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class StudentAttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    LEAVE = "LEAVE"
    MEDICAL_LEAVE = "MEDICAL_LEAVE"
    HOLIDAY = "HOLIDAY"
    HALF_DAY = "HALF_DAY"

# Backward compatibility class mapping both uppercase and lowercase attributes
class AttendanceStatus:
    PRESENT = StudentAttendanceStatus.PRESENT
    ABSENT = StudentAttendanceStatus.ABSENT
    LATE = StudentAttendanceStatus.LATE
    LEAVE = StudentAttendanceStatus.LEAVE
    MEDICAL_LEAVE = StudentAttendanceStatus.MEDICAL_LEAVE
    HOLIDAY = StudentAttendanceStatus.HOLIDAY
    HALF_DAY = StudentAttendanceStatus.HALF_DAY

    present = "present"
    absent = "absent"
    late = "late"
    leave = "leave"
    holiday = "holiday"
    half_day = "half_day"


class StaffAttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"
    ON_LEAVE = "ON_LEAVE"
    HALF_DAY = "HALF_DAY"
    HOLIDAY = "HOLIDAY"
    WEEKLY_OFF = "WEEKLY_OFF"


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_name = Column(String(100), nullable=True, index=True)
    department = Column(String(100), nullable=True, index=True)
    section = Column(String(50), nullable=True)
    semester = Column(Integer, nullable=True)
    session_year = Column(String(50), nullable=True, default="2024-25")
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    session_date = Column(Date, nullable=False, index=True)
    lecture_no = Column(Integer, default=1)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    status = Column(String(50), default="SUBMITTED")  # DRAFT or SUBMITTED
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("User", foreign_keys=[teacher_id])
    subject = relationship("Subject")


class StudentAttendanceRecord(Base):
    __tablename__ = "student_attendance"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    lecture_no = Column(Integer, default=1)
    status = Column(SAEnum(StudentAttendanceStatus), nullable=False, default=StudentAttendanceStatus.PRESENT)
    marked_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('student_id', 'date', 'lecture_no', 'subject_id', name='uq_student_lecture_attendance'),
    )

    student = relationship("User", foreign_keys=[student_id])
    marked_by = relationship("User", foreign_keys=[marked_by_id])
    subject = relationship("Subject")


class StaffAttendanceRecord(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    working_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    break_hours = Column(Float, default=0.0)
    status = Column(SAEnum(StaffAttendanceStatus), nullable=False, default=StaffAttendanceStatus.PRESENT)
    is_late = Column(Boolean, default=False)
    late_minutes = Column(Integer, default=0)
    is_early_exit = Column(Boolean, default=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('staff_id', 'date', name='uq_staff_daily_attendance'),
    )

    staff = relationship("User", foreign_keys=[staff_id])


class AttendanceSummary(Base):
    __tablename__ = "attendance_summary"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    role = Column(String(50), default="student")
    total_working_days = Column(Integer, default=0)
    present_days = Column(Integer, default=0)
    absent_days = Column(Integer, default=0)
    leave_days = Column(Integer, default=0)
    late_days = Column(Integer, default=0)
    half_days = Column(Integer, default=0)
    consecutive_absent_days = Column(Integer, default=0)
    attendance_percentage = Column(Float, default=100.0)
    total_working_hours = Column(Float, default=0.0)  # Staff only
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class HolidayRecord(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=False, unique=True, index=True)
    holiday_type = Column(String(100), default="PUBLIC_HOLIDAY")  # PUBLIC_HOLIDAY, VACATION, EXAM_DAY, SPECIAL
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkingDay(Base):
    __tablename__ = "working_days"

    id = Column(Integer, primary_key=True, index=True)
    day_name = Column(String(50), unique=True, nullable=False)  # Monday, Tuesday, etc.
    is_working = Column(Boolean, default=True)


class AttendanceAuditLog(Base):
    __tablename__ = "attendance_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), default="STUDENT")  # STUDENT or STAFF
    record_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)  # MARKED, MODIFIED, REVERSED
    modified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(100), nullable=True)

    modified_by = relationship("User", foreign_keys=[modified_by_id])


class AttendanceSetting(Base):
    __tablename__ = "attendance_settings"

    id = Column(Integer, primary_key=True, index=True)
    low_attendance_threshold = Column(Float, default=75.0)  # Low attendance warning threshold
    staff_work_hours_standard = Column(Float, default=8.0)
    grace_period_minutes = Column(Integer, default=15)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Legacy Compatibility Model Alias
class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="present")
    marked_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])
    subject = relationship("Subject")
    marked_by = relationship("User", foreign_keys=[marked_by_id])
