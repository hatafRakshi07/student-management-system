from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


class RoomType(str, enum.Enum):
    SMART_CLASS = "SMART_CLASS"
    LABORATORY = "LABORATORY"
    LECTURE_HALL = "LECTURE_HALL"
    SEMINAR_HALL = "SEMINAR_HALL"


class EventCategory(str, enum.Enum):
    EXAM = "EXAM"
    HOLIDAY = "HOLIDAY"
    VACATION = "VACATION"
    CULTURAL = "CULTURAL"
    SPORTS = "SPORTS"
    ORIENTATION = "ORIENTATION"
    GENERAL = "GENERAL"


class DayOfWeek(str, enum.Enum):
    MONDAY = "MONDAY"
    TUESDAY = "TUESDAY"
    WEDNESDAY = "WEDNESDAY"
    THURSDAY = "THURSDAY"
    FRIDAY = "FRIDAY"
    SATURDAY = "SATURDAY"


class AcademicSessionRecord(Base):
    __tablename__ = "academic_session_records"

    id = Column(Integer, primary_key=True, index=True)
    session_year = Column(String(50), nullable=False, index=True)  # e.g. 2024-25
    semester = Column(Integer, default=1)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClassroomRecord(Base):
    __tablename__ = "classroom_records"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), unique=True, index=True, nullable=False)
    building = Column(String(100), default="Main Academic Block")
    floor = Column(String(20), default="1st Floor")
    capacity = Column(Integer, default=60)
    room_type = Column(SAEnum(RoomType), default=RoomType.LECTURE_HALL)
    has_projector = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    slots = relationship("TimetableSlotRecord", back_populates="room")


class FacultySubjectAllocation(Base):
    __tablename__ = "faculty_subject_allocations"

    id = Column(Integer, primary_key=True, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    class_name = Column(String(100), nullable=False)
    section = Column(String(20), default="A")
    session_year = Column(String(50), default="2024-25")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('faculty_user_id', 'subject_id', 'class_name', 'section', 'session_year', name='uq_faculty_alloc'),
    )

    faculty = relationship("User", foreign_keys=[faculty_user_id])
    subject = relationship("Subject", foreign_keys=[subject_id])


class TimetableSlotRecord(Base):
    __tablename__ = "timetable_slot_records"

    id = Column(Integer, primary_key=True, index=True)
    day_of_week = Column(SAEnum(DayOfWeek), nullable=False, index=True)
    time_slot = Column(String(50), nullable=False)  # e.g. "09:00 AM - 10:00 AM"
    
    class_name = Column(String(100), nullable=False, index=True)
    section = Column(String(20), default="A")
    semester = Column(Integer, default=1)
    
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("classroom_records.id", ondelete="CASCADE"), nullable=False, index=True)
    
    session_year = Column(String(50), default="2024-25")
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", foreign_keys=[subject_id])
    faculty = relationship("User", foreign_keys=[faculty_user_id])
    room = relationship("ClassroomRecord", back_populates="slots")


class AcademicCalendarEvent(Base):
    __tablename__ = "academic_calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    event_category = Column(SAEnum(EventCategory), default=EventCategory.GENERAL, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    is_holiday = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FacultyWorkloadSummary(Base):
    __tablename__ = "faculty_workload_summaries"

    id = Column(Integer, primary_key=True, index=True)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    weekly_theory_hours = Column(Float, default=12.0)
    weekly_lab_hours = Column(Float, default=6.0)
    total_weekly_hours = Column(Float, default=18.0)
    utilization_percentage = Column(Float, default=90.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    faculty = relationship("User", foreign_keys=[faculty_user_id])


class TimetableAuditLog(Base):
    __tablename__ = "timetable_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
