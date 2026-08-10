from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship, foreign
from datetime import datetime
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
    father_mobile = Column(String(50), nullable=True, index=True)
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

    # Step 9 Database Design requirement fields
    admission_no = Column(String(100), index=True, nullable=True)
    student_name = Column(String(255), nullable=True, index=True)
    mobile = Column(String(50), index=True, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])

    @property
    def academic_history(self):
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if not session:
            return []
        return session.query(StudentAcademicHistory).filter(StudentAcademicHistory.student_id == self.user_id).all()

    @property
    def promotions(self):
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if not session:
            return []
        return session.query(StudentPromotion).filter(StudentPromotion.student_id == self.user_id).all()

    @property
    def documents(self):
        from sqlalchemy.orm import object_session
        session = object_session(self)
        if not session:
            return []
        return session.query(StudentDocument).filter(StudentDocument.student_id == self.user_id).all()



class StudentAcademicHistory(Base):
    __tablename__ = "student_academic_history"

    academic_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session = Column(String(50), nullable=False, index=True)
    course = Column(String(100), nullable=True)
    class_name = Column(String(100), nullable=True)
    semester = Column(String(50), nullable=True)
    section = Column(String(50), nullable=True)
    roll_no = Column(String(100), nullable=True)
    admission_date = Column(Date, nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class StudentPromotion(Base):
    __tablename__ = "student_promotions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    from_session = Column(String(50), nullable=True)
    to_session = Column(String(50), nullable=True)
    from_class = Column(String(100), nullable=True)
    to_class = Column(String(100), nullable=True)
    promotion_date = Column(Date, default=datetime.utcnow)
    remarks = Column(String(255), nullable=True)

    student = relationship("User", foreign_keys=[student_id])


class StudentDocument(Base):
    __tablename__ = "student_documents"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=True)
    file_path = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id])


class ClassMaster(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    course_name = Column(String(100), nullable=True)


class SectionMaster(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    class_name = Column(String(100), nullable=True)


class CategoryMaster(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class CourseMaster(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    department_name = Column(String(100), nullable=True)


class DepartmentMaster(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)


class ArchivedStudent(Base):
    __tablename__ = "archived_students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roll_number = Column(String(100), index=True, nullable=True)
    reg_no = Column(String(100), index=True, nullable=True)
    admission_no = Column(String(100), index=True, nullable=True)
    student_name = Column(String(255), nullable=True)
    father_name = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    mobile = Column(String(50), index=True, nullable=True)
    class_name = Column(String(100), nullable=True)
    academic_session = Column(String(50), nullable=True)
    admission_year = Column(String(50), nullable=True)
    current_status = Column(String(50), default="ARCHIVED")
    created_at = Column(DateTime, default=datetime.utcnow)


class AlumniStudent(Base):
    __tablename__ = "alumni_students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    roll_number = Column(String(100), index=True, nullable=True)
    reg_no = Column(String(100), index=True, nullable=True)
    admission_no = Column(String(100), index=True, nullable=True)
    student_name = Column(String(255), nullable=True)
    father_name = Column(String(255), nullable=True)
    graduation_year = Column(String(50), nullable=True)
    academic_session = Column(String(50), nullable=True)
    current_status = Column(String(50), default="GRADUATED")
    created_at = Column(DateTime, default=datetime.utcnow)


