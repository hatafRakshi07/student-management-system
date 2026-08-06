from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


# ==========================================
# PHASE 26 — LMS ENUMS & MODELS
# ==========================================

class ContentType(str, enum.Enum):
    VIDEO = "VIDEO"
    PDF = "PDF"
    PPT = "PPT"
    NOTES = "NOTES"
    EXTERNAL_LINK = "EXTERNAL_LINK"


class AdmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    SELECTED = "SELECTED"
    CONFIRMED = "CONFIRMED"


class AccountType(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"
    EQUITY = "EQUITY"


class VoucherType(str, enum.Enum):
    JOURNAL = "JOURNAL"
    RECEIPT = "RECEIPT"
    PAYMENT = "PAYMENT"
    CONTRA = "CONTRA"


# --- LMS MODELS ---
class LMSCourseContent(Base):
    __tablename__ = "lms_course_contents"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    module_name = Column(String(100), default="Module 1: Fundamentals")
    lesson_title = Column(String(255), nullable=False)
    content_type = Column(SAEnum(ContentType), default=ContentType.VIDEO)
    file_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", foreign_keys=[subject_id])


class LMSQuiz(Base):
    __tablename__ = "lms_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    duration_minutes = Column(Integer, default=20)
    total_marks = Column(Float, default=10.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    subject = relationship("Subject", foreign_keys=[subject_id])
    questions = relationship("LMSQuizQuestion", back_populates="quiz", cascade="all, delete-orphan")


class LMSQuizQuestion(Base):
    __tablename__ = "lms_quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("lms_quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_option = Column(String(10), nullable=False, default="A")
    marks = Column(Float, default=2.5)

    quiz = relationship("LMSQuiz", back_populates="questions")


class LMSAssignmentSubmission(Base):
    __tablename__ = "lms_assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String(500), nullable=True)
    submission_text = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    marks_obtained = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    assignment = relationship("Assignment", foreign_keys=[assignment_id])
    student = relationship("StudentProfile", foreign_keys=[student_id])


class LMSStudentProgress(Base):
    __tablename__ = "lms_student_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    progress_percentage = Column(Float, default=0.0)
    last_accessed = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('student_id', 'subject_id', name='uq_lms_progress'),
    )


# --- PHASE 27: ONLINE ADMISSION MODELS ---
class AdmissionApplication(Base):
    __tablename__ = "admission_applications"

    id = Column(Integer, primary_key=True, index=True)
    registration_no = Column(String(50), unique=True, index=True, nullable=False)
    applicant_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(20), nullable=False)
    father_name = Column(String(255), nullable=True)
    course_applied = Column(String(100), nullable=False, default="B.A. I-SEM")
    
    tenth_percentage = Column(Float, default=75.0)
    twelfth_percentage = Column(Float, default=78.0)
    category = Column(String(50), default="General")
    
    status = Column(SAEnum(AdmissionStatus), default=AdmissionStatus.SUBMITTED, index=True)
    application_fee_paid = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("AdmissionDocument", back_populates="application", cascade="all, delete-orphan")


class AdmissionDocument(Base):
    __tablename__ = "admission_documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("admission_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(100), nullable=False)  # 10TH_MARKSHEET, 12TH_MARKSHEET, AADHAAR, PHOTO
    file_url = Column(String(500), nullable=False)
    is_verified = Column(Boolean, default=True)

    application = relationship("AdmissionApplication", back_populates="documents")


class AdmissionMeritList(Base):
    __tablename__ = "admission_merit_lists"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("admission_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    merit_rank = Column(Integer, nullable=False)
    cutoff_percentage = Column(Float, nullable=False)
    is_selected = Column(Boolean, default=True)


# --- PHASE 28: FINANCE & ACCOUNTS ERP MODELS ---
class LedgerAccount(Base):
    __tablename__ = "ledger_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(50), unique=True, index=True, nullable=False)
    account_name = Column(String(255), nullable=False, index=True)
    account_type = Column(SAEnum(AccountType), nullable=False, index=True)
    opening_balance = Column(Float, default=0.0)
    current_balance = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    voucher_no = Column(String(50), unique=True, index=True, nullable=False)
    voucher_type = Column(SAEnum(VoucherType), default=VoucherType.JOURNAL)
    entry_date = Column(Date, nullable=False, default=date.today)
    narration = Column(Text, nullable=False)
    total_amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    line_items = relationship("JournalLineItem", back_populates="journal_entry", cascade="all, delete-orphan")


class JournalLineItem(Base):
    __tablename__ = "journal_line_items"

    id = Column(Integer, primary_key=True, index=True)
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    ledger_id = Column(Integer, ForeignKey("ledger_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    debit_amount = Column(Float, default=0.0)
    credit_amount = Column(Float, default=0.0)

    journal_entry = relationship("JournalEntry", back_populates="line_items")
    ledger = relationship("LedgerAccount")


class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String(50), default="RECEIPT")  # RECEIPT, PAYMENT
    payment_mode = Column(String(50), default="CASH")
    amount = Column(Float, nullable=False)
    reference_no = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    txn_date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)
