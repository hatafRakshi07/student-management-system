from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class ExamCategory(str, enum.Enum):
    MIDTERM = "MIDTERM"
    SEMESTER = "SEMESTER"
    PRACTICAL = "PRACTICAL"
    ANNUAL = "ANNUAL"
    BACK_PAPER = "BACK_PAPER"
    REVALUATION = "REVALUATION"
    SUPPLEMENTARY = "SUPPLEMENTARY"


class ResultStatus(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    ATKT = "ATKT"
    GRACE_PASS = "GRACE_PASS"
    PENDING = "PENDING"


class ExamSchedule(Base):
    __tablename__ = "exam_schedule"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    session_year = Column(String(50), default="2024-25", index=True)
    semester = Column(Integer, default=1, index=True)
    class_name = Column(String(100), nullable=True, index=True)
    department = Column(String(100), nullable=True)
    section = Column(String(50), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    exam_category = Column(SAEnum(ExamCategory), nullable=False, default=ExamCategory.SEMESTER)
    exam_date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Float, default=100.0)
    theory_max = Column(Float, default=70.0)
    internal_max = Column(Float, default=20.0)
    practical_max = Column(Float, default=10.0)
    passing_marks = Column(Float, default=40.0)
    status = Column(String(50), default="PUBLISHED")  # DRAFT, PUBLISHED, COMPLETED
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", backref="exam_schedules")
    mark_records = relationship("MarkRecord", back_populates="exam", cascade="all, delete-orphan")


class MarkRecord(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exam_schedule.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    
    theory_marks = Column(Float, default=0.0)
    internal_marks = Column(Float, default=0.0)
    practical_marks = Column(Float, default=0.0)
    viva_marks = Column(Float, default=0.0)
    grace_marks = Column(Float, default=0.0)
    marks_obtained = Column(Float, nullable=False, default=0.0)
    total_obtained = Column(Float, nullable=False, default=0.0)
    
    letter_grade = Column(String(10), default="F")
    grade_point = Column(Float, default=0.0)
    is_pass = Column(Boolean, default=True)
    remarks = Column(Text, nullable=True)
    marked_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('student_id', 'exam_id', name='uq_student_exam_mark'),
    )

    student = relationship("User", foreign_keys=[student_id], backref="exam_marks")
    exam = relationship("ExamSchedule", back_populates="mark_records")
    subject = relationship("Subject")
    marked_by = relationship("User", foreign_keys=[marked_by_id])


class ResultSummary(Base):
    __tablename__ = "result_summary"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_year = Column(String(50), default="2024-25", index=True)
    semester = Column(Integer, default=1, index=True)
    class_name = Column(String(100), nullable=True)
    
    total_credits = Column(Integer, default=20)
    total_max_marks = Column(Float, default=500.0)
    total_obtained_marks = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    
    sgpa = Column(Float, default=0.0)
    cgpa = Column(Float, default=0.0)
    letter_grade = Column(String(10), default="B")
    division = Column(String(50), default="FIRST DIVISION")
    result_status = Column(SAEnum(ResultStatus), default=ResultStatus.PASS)
    
    college_rank = Column(Integer, nullable=True)
    dept_rank = Column(Integer, nullable=True)
    class_rank = Column(Integer, nullable=True)
    qr_token = Column(String(255), nullable=True)
    
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('student_id', 'session_year', 'semester', name='uq_student_semester_result'),
    )

    student = relationship("User", foreign_keys=[student_id], backref="result_summaries")


class GradeSystemRule(Base):
    __tablename__ = "grade_system"

    id = Column(Integer, primary_key=True, index=True)
    min_score = Column(Float, nullable=False)
    max_score = Column(Float, nullable=False)
    letter_grade = Column(String(10), nullable=False)
    grade_point = Column(Float, nullable=False)
    description = Column(String(100), nullable=True)


class CGPAHistory(Base):
    __tablename__ = "cgpa_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    semester = Column(Integer, nullable=False)
    sgpa = Column(Float, nullable=False)
    cgpa = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)


class BacklogHistory(Base):
    __tablename__ = "backlog_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    semester = Column(Integer, nullable=False)
    failed_date = Column(Date, nullable=False)
    cleared_date = Column(Date, nullable=True)
    is_cleared = Column(Boolean, default=False)
    attempts = Column(Integer, default=1)

    student = relationship("User", foreign_keys=[student_id])
    subject = relationship("Subject")


class RevaluationRequest(Base):
    __tablename__ = "revaluation_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mark_id = Column(Integer, ForeignKey("marks.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)
    application_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    old_marks = Column(Float, nullable=False)
    updated_marks = Column(Float, nullable=True)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    mark = relationship("MarkRecord")
    subject = relationship("Subject")


class ExamAuditLog(Base):
    __tablename__ = "exam_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    mark_id = Column(Integer, nullable=False)
    modified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_marks = Column(Float, nullable=True)
    new_marks = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    modified_by = relationship("User", foreign_keys=[modified_by_id])


# Legacy Compatibility Aliases
ExamType = ExamCategory

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    exam_date = Column(DateTime, nullable=False)
    exam_type = Column(String(50), nullable=False, default="midterm")
    total_marks = Column(Float, default=100.0)
    passing_marks = Column(Float, default=40.0)
    duration_minutes = Column(Integer, default=180)
    class_name = Column(String(100), nullable=True)
    section = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject")


class Mark(Base):
    __tablename__ = "legacy_marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    marks_obtained = Column(Float, nullable=False)
    grade = Column(String(5), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
