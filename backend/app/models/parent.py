from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


class RelationshipType(str, enum.Enum):
    FATHER = "FATHER"
    MOTHER = "MOTHER"
    GUARDIAN = "GUARDIAN"


class PTMStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RESCHEDULED = "RESCHEDULED"


class ParentProfile(Base):
    __tablename__ = "parent_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    father_name = Column(String(255), nullable=True)
    mother_name = Column(String(255), nullable=True)
    guardian_name = Column(String(255), nullable=True)
    relationship_type = Column(SAEnum(RelationshipType), default=RelationshipType.FATHER)
    
    mobile = Column(String(20), nullable=True, index=True)
    alt_mobile = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    occupation = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class ParentStudentMapping(Base):
    __tablename__ = "parent_student_mappings"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    relationship_type = Column(SAEnum(RelationshipType), default=RelationshipType.FATHER)
    is_primary = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('parent_id', 'student_id', name='uq_parent_student'),
    )

    parent = relationship("ParentProfile", foreign_keys=[parent_id])
    student = relationship("StudentProfile", foreign_keys=[student_id])


class PTMRequest(Base):
    __tablename__ = "parent_teacher_meetings"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    requested_date = Column(Date, nullable=False)
    preferred_time = Column(String(50), nullable=False, default="10:00 AM - 11:00 AM")
    purpose = Column(Text, nullable=False)
    status = Column(SAEnum(PTMStatus), default=PTMStatus.PENDING, index=True)
    teacher_remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parent = relationship("ParentProfile", foreign_keys=[parent_id])
    student = relationship("StudentProfile", foreign_keys=[student_id])
    teacher = relationship("User", foreign_keys=[teacher_id])


class ParentMessage(Base):
    __tablename__ = "parent_messages"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parent_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_user_id])
    receiver = relationship("User", foreign_keys=[receiver_user_id])


class ParentAuditLog(Base):
    __tablename__ = "parent_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
