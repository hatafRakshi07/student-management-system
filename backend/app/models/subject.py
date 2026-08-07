from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    class_name = Column(String(100), nullable=True)
    section = Column(String(20), nullable=True)
    semester = Column(Integer, nullable=True)
    credits = Column(Integer, default=3)

    teacher = relationship("User", foreign_keys=[teacher_id])
