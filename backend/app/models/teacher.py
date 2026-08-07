from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)
    qualification = Column(String(255), nullable=True)
    experience_years = Column(Integer, nullable=True)
    subjects_taught = Column(String(500), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
