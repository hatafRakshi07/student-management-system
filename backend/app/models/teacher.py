from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)
    subject = Column(String(255), nullable=True)
    title = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=True)
    qualification = Column(String(255), nullable=True)
    experience_years = Column(Float, nullable=True)
    subjects_taught = Column(String(500), nullable=True)
    is_hod = Column(Boolean, default=False)
    data_source = Column(String(255), default="Official Aklank College Website")
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="Active")

    user = relationship("User", foreign_keys=[user_id])


class TeacherCourseAssignment(Base):
    __tablename__ = "teacher_course_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)  # e.g. "Computer Science", "Humanities"
    course_name = Column(String(100), nullable=False, index=True)  # e.g. "BCA", "BA", "B.Sc Biology", "B.Sc Maths"
    subject_name = Column(String(100), nullable=True)  # e.g. "English", "Zoology", "DBMS"
    year = Column(String(50), nullable=True)  # e.g. "1st Year", "2nd Year", "3rd Year"
    semester = Column(Integer, nullable=True)
    section = Column(String(50), nullable=True, default="All")
    academic_session = Column(String(50), nullable=True, default="2025-26")
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    teacher = relationship("User", foreign_keys=[teacher_id])

