from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class StudyNote(Base):
    __tablename__ = "study_notes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=False, index=True)
    department = Column(String(100), nullable=True, index=True)
    class_name = Column(String(100), nullable=True, index=True)
    semester = Column(String(20), nullable=True)
    
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=True)  # pdf, docx, pptx, image
    file_size_bytes = Column(Integer, nullable=True)
    
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = relationship("User", foreign_keys=[teacher_id])
