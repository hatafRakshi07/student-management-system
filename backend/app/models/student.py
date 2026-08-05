from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    roll_number = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=True)
    class_name = Column(String(100), nullable=True)
    section = Column(String(20), nullable=True)
    semester = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    parent_email = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)

    # Extended Aklank Excel fields
    reg_no = Column(String(100), index=True, nullable=True)
    father_name = Column(String(255), nullable=True)
    mother_name = Column(String(255), nullable=True)
    gender = Column(String(50), nullable=True)
    category = Column(String(50), nullable=True)
    student_type = Column(String(50), nullable=True)
    reg_date = Column(Date, nullable=True)
    reg_class = Column(String(100), nullable=True)
    religion = Column(String(50), nullable=True)
    father_mobile = Column(String(50), nullable=True)
    mother_phone = Column(String(50), nullable=True)
    mother_mobile = Column(String(50), nullable=True)
    permanent_address = Column(String(500), nullable=True)
    exist_status = Column(String(50), nullable=True)
    minority = Column(Integer, nullable=True)
    permanent_area = Column(String(255), nullable=True)
    discount_remark = Column(String(255), nullable=True)
    janaadhar_no = Column(String(100), nullable=True)
    blood_group = Column(String(20), nullable=True)
    allergies = Column(String(255), nullable=True)
    pre_school_name = Column(String(255), nullable=True)
    board_roll_no_12 = Column(String(100), nullable=True)
    board_roll_no_10 = Column(String(100), nullable=True)
    extra_fields = Column(String(2000), nullable=True)

    user = relationship("User", back_populates="student_profile")
