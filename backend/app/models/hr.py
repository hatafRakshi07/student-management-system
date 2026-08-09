from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


class EmploymentType(str, enum.Enum):
    PERMANENT = "PERMANENT"
    CONTRACT = "CONTRACT"
    GUEST = "GUEST"
    PART_TIME = "PART_TIME"


class StaffStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    RETIRED = "RETIRED"
    RESIGNED = "RESIGNED"


class PayrollStatus(str, enum.Enum):
    PAID = "PAID"
    PENDING = "PENDING"
    CANCELLED = "CANCELLED"


class StaffDetail(Base):
    __tablename__ = "staff_details"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    
    department = Column(String(100), nullable=True, index=True)
    designation = Column(String(100), nullable=True, index=True)
    employment_type = Column(SAEnum(EmploymentType), default=EmploymentType.PERMANENT)
    status = Column(SAEnum(StaffStatus), default=StaffStatus.ACTIVE, index=True)
    
    joining_date = Column(Date, nullable=True)
    dob = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    
    emergency_contact = Column(String(50), nullable=True)
    aadhaar_number = Column(String(20), nullable=True)
    pan_number = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    
    qualification = Column(String(255), nullable=True)
    experience_years = Column(Float, nullable=True)
    teaching_subjects = Column(String(500), nullable=True)
    subject = Column(String(255), nullable=True)
    title = Column(String(50), nullable=True)
    is_hod = Column(Boolean, default=False)
    data_source = Column(String(255), default="Official Aklank College Website")
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class StaffBankDetail(Base):
    __tablename__ = "staff_bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_details.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    bank_name = Column(String(100), nullable=False)
    account_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(20), nullable=False)
    branch_name = Column(String(100), nullable=True)
    upi_id = Column(String(100), nullable=True)
    pf_number = Column(String(50), nullable=True)
    esic_number = Column(String(50), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    staff = relationship("StaffDetail", foreign_keys=[staff_id])


class StaffSalaryStructure(Base):
    __tablename__ = "staff_salary_structure"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_details.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    basic_pay = Column(Float, nullable=False, default=25000.0)
    da_allowance = Column(Float, default=5000.0)
    hra_allowance = Column(Float, default=4000.0)
    ta_allowance = Column(Float, default=2000.0)
    medical_allowance = Column(Float, default=1000.0)
    bonus = Column(Float, default=0.0)
    special_allowance = Column(Float, default=1000.0)
    
    pf_deduction = Column(Float, default=1800.0)
    esic_deduction = Column(Float, default=500.0)
    prof_tax = Column(Float, default=200.0)
    income_tax = Column(Float, default=1000.0)
    loan_deduction = Column(Float, default=0.0)
    other_deductions = Column(Float, default=0.0)
    
    gross_salary = Column(Float, nullable=False, default=38000.0)
    net_salary = Column(Float, nullable=False, default=34500.0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    staff = relationship("StaffDetail", foreign_keys=[staff_id])


class SalaryTransaction(Base):
    __tablename__ = "salary_transactions"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_details.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    month = Column(String(20), nullable=False)
    year = Column(Integer, nullable=False)
    payment_date = Column(Date, nullable=False, default=date.today)
    
    gross_salary = Column(Float, nullable=False)
    total_deductions = Column(Float, nullable=False)
    net_salary = Column(Float, nullable=False)
    
    payment_mode = Column(String(50), default="BANK_TRANSFER")
    status = Column(SAEnum(PayrollStatus), default=PayrollStatus.PAID)
    remarks = Column(Text, nullable=True)
    payslip_token = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('staff_id', 'month', 'year', name='uq_staff_monthly_salary'),
    )

    staff = relationship("StaffDetail", foreign_keys=[staff_id])
    user = relationship("User", foreign_keys=[user_id])


class StaffLeaveBalance(Base):
    __tablename__ = "staff_leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff_details.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    casual_leave = Column(Integer, default=12)
    sick_leave = Column(Integer, default=10)
    medical_leave = Column(Integer, default=15)
    earned_leave = Column(Integer, default=15)
    
    casual_used = Column(Integer, default=0)
    sick_used = Column(Integer, default=0)
    medical_used = Column(Integer, default=0)
    earned_used = Column(Integer, default=0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    staff = relationship("StaffDetail", foreign_keys=[staff_id])


class StaffAuditLog(Base):
    __tablename__ = "staff_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, nullable=False)
    action = Column(String(100), nullable=False)  # PROFILE_UPDATED, SALARY_UPDATED, PAYROLL_DISBURSED
    modified_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    modified_by = relationship("User", foreign_keys=[modified_by_id])
