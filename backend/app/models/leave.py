from sqlalchemy import Column, Integer, Text, Date, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Leave(Base):
    __tablename__ = "leaves"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    status = Column(SAEnum(LeaveStatus), default=LeaveStatus.pending)
    applied_at = Column(DateTime, default=datetime.utcnow)
    reviewed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_remarks = Column(Text, nullable=True)

    student = relationship("User", foreign_keys=[student_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])


# Alias for backward compatibility
LeaveRequest = Leave

