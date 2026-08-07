from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class TargetRole(str, enum.Enum):
    all = "all"
    student = "student"
    teacher = "teacher"
    parent = "parent"
    admin = "admin"


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    target_role = Column(SAEnum(TargetRole), default=TargetRole.all)
    is_active = Column(Integer, default=1)

    created_by = relationship("User", foreign_keys=[created_by_id])
