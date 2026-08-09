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
