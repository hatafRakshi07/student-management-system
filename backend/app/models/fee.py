from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class FeeStatus(str, enum.Enum):
    paid = "paid"
    unpaid = "unpaid"
    partial = "partial"
    overdue = "overdue"


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    fee_type = Column(String(100), default="tuition")
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    payment_date = Column(DateTime, nullable=True)
    status = Column(SAEnum(FeeStatus), default=FeeStatus.unpaid)
    transaction_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="fees")


class FeeTransaction(Base):
    __tablename__ = "fee_transactions"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(100), unique=True, index=True, nullable=False)  # Vchr. No
    voucher_type = Column(String(50), nullable=True)  # Vchr. Type
    voucher_date = Column(DateTime, nullable=True)  # Vchr. Date
    add_date = Column(DateTime, nullable=True)  # Add Date
    manual_ref_no = Column(String(100), nullable=True)  # Mannual Ref. No.
    reg_no = Column(String(100), index=True, nullable=True)  # Reg No
    scholar_no = Column(String(100), index=True, nullable=True)
    student_name = Column(String(255), nullable=True)
    father_name = Column(String(255), nullable=True)
    class_name = Column(String(100), nullable=True)
    section = Column(String(50), nullable=True)
    mobile_no = Column(String(50), nullable=True)
    fee_head = Column(String(100), nullable=True)
    installment = Column(String(100), nullable=True)
    paid_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)  # Less Amount
    refund_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)
    payment_mode = Column(String(50), nullable=True)  # Pay Mode
    bank_name = Column(String(255), nullable=True)
    cheque_number = Column(String(100), nullable=True)
    cheque_date = Column(DateTime, nullable=True)
    transaction_id = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)
    cancelled_status = Column(String(10), default="N")
    cancelled_amount = Column(Float, default=0.0)
    created_by = Column(String(255), nullable=True)  # AddUser / Cancelled By
    company_name = Column(String(255), nullable=True)

    student_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    is_matched = Column(Boolean, default=False)
    extra_columns = Column(Text, nullable=True)  # JSON representation of raw CSV row

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="fee_transactions")


class FeeInstallment(Base):
    __tablename__ = "fee_installments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    installment_name = Column(String(100), nullable=False)
    due_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    due_date = Column(DateTime, nullable=True)
    status = Column(SAEnum(FeeStatus), default=FeeStatus.unpaid)
    created_at = Column(DateTime, default=datetime.utcnow)


class FeeDiscount(Base):
    __tablename__ = "fee_discounts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    discount_amount = Column(Float, default=0.0)
    discount_type = Column(String(100), nullable=True)
    remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UnmatchedFeeRecord(Base):
    __tablename__ = "unmatched_fee_records"

    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String(100), nullable=True, index=True)
    reg_no = Column(String(100), nullable=True, index=True)
    student_name = Column(String(255), nullable=True)
    class_name = Column(String(100), nullable=True)
    paid_amount = Column(Float, default=0.0)
    payment_mode = Column(String(50), nullable=True)
    raw_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    import_type = Column(String(100), default="AKLANK_MASTER_AND_FEES")
    status = Column(String(50), default="COMPLETED")
    student_records_found = Column(Integer, default=0)
    students_imported = Column(Integer, default=0)
    students_updated = Column(Integer, default=0)
    users_created = Column(Integer, default=0)
    duplicate_usernames_fixed = Column(Integer, default=0)
    fee_records_found = Column(Integer, default=0)
    fee_transactions_imported = Column(Integer, default=0)
    fee_transactions_updated = Column(Integer, default=0)
    duplicate_receipts_updated = Column(Integer, default=0)
    unmatched_fee_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    report_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FeeReceipt(Base):
    __tablename__ = "fee_receipts"

    receipt_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_no = Column(String(100), nullable=True, index=True)
    receipt_no = Column(String(100), nullable=True, index=True)
    receipt_date = Column(DateTime, nullable=True)
    payment_mode = Column(String(50), nullable=True)
    amount = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    fine = Column(Float, default=0.0)
    late_fee = Column(Float, default=0.0)
    concession = Column(Float, default=0.0)
    bank_name = Column(String(255), nullable=True)
    transaction_id = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    session = Column(String(50), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="fee_receipts")


class FeeSummary(Base):
    __tablename__ = "fee_summary"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    total_fee = Column(Float, default=0.0)
    total_paid = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    scholarship = Column(Float, default=0.0)
    concession = Column(Float, default=0.0)
    pending_fee = Column(Float, default=0.0)
    balance = Column(Float, default=0.0)
    last_payment_date = Column(DateTime, nullable=True)
    installments_paid = Column(Integer, default=0)
    current_status = Column(String(50), default="UNPAID")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="fee_summary")


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    receipt_id = Column(Integer, ForeignKey("fee_receipts.receipt_id", ondelete="SET NULL"), nullable=True, index=True)
    payment_mode = Column(String(50), nullable=True)
    bank = Column(String(255), nullable=True)
    upi = Column(String(100), nullable=True)
    cheque = Column(String(100), nullable=True)
    cash = Column(String(100), nullable=True)
    reference_number = Column(String(255), nullable=True)
    payment_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], backref="payments")
    receipt = relationship("FeeReceipt", foreign_keys=[receipt_id], backref="payments")

