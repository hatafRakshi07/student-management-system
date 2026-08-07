from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


class BookStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ISSUED = "ISSUED"
    RESERVED = "RESERVED"
    LOST = "LOST"
    DAMAGED = "DAMAGED"


class MemberType(str, enum.Enum):
    STUDENT = "STUDENT"
    FACULTY = "FACULTY"
    STAFF = "STAFF"


class IssueStatus(str, enum.Enum):
    ISSUED = "ISSUED"
    RETURNED = "RETURNED"
    OVERDUE = "OVERDUE"
    LOST = "LOST"


class FineStatus(str, enum.Enum):
    PAID = "PAID"
    PENDING = "PENDING"
    WAIVED = "WAIVED"


class LibraryBookRecord(Base):
    __tablename__ = "library_book_records"

    id = Column(Integer, primary_key=True, index=True)
    accession_no = Column(String(50), unique=True, index=True, nullable=False)
    isbn = Column(String(50), index=True, nullable=True)
    barcode_token = Column(String(100), unique=True, index=True, nullable=True)
    
    title = Column(String(255), nullable=False, index=True)
    subtitle = Column(String(255), nullable=True)
    author = Column(String(255), nullable=False, index=True)
    publisher = Column(String(255), nullable=True)
    edition = Column(String(50), default="1st Edition")
    language = Column(String(50), default="English")
    
    subject = Column(String(100), nullable=True, index=True)
    department = Column(String(100), nullable=True, index=True)
    shelf_rack = Column(String(50), default="Shelf A-1")
    
    total_copies = Column(Integer, default=5)
    available_copies = Column(Integer, default=5)
    status = Column(SAEnum(BookStatus), default=BookStatus.AVAILABLE, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)


class LibraryMemberRecord(Base):
    __tablename__ = "library_member_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    member_code = Column(String(50), unique=True, index=True, nullable=False)
    member_type = Column(SAEnum(MemberType), default=MemberType.STUDENT)
    
    max_issue_limit = Column(Integer, default=3)
    current_borrowed = Column(Integer, default=0)
    fine_balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class LibraryIssueTransaction(Base):
    __tablename__ = "library_issue_transactions"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("library_book_records.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("library_member_records.id", ondelete="CASCADE"), nullable=False, index=True)
    
    issue_date = Column(Date, nullable=False, default=date.today)
    due_date = Column(Date, nullable=False)
    return_date = Column(Date, nullable=True)
    
    status = Column(SAEnum(IssueStatus), default=IssueStatus.ISSUED, index=True)
    late_days = Column(Integer, default=0)
    fine_amount = Column(Float, default=0.0)
    remarks = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    book = relationship("LibraryBookRecord", foreign_keys=[book_id])
    member = relationship("LibraryMemberRecord", foreign_keys=[member_id])


class LibraryBookReservation(Base):
    __tablename__ = "library_book_reservations"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("library_book_records.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("library_member_records.id", ondelete="CASCADE"), nullable=False, index=True)
    
    reservation_date = Column(Date, nullable=False, default=date.today)
    status = Column(String(50), default="PENDING")  # PENDING, FULFILLED, CANCELLED
    created_at = Column(DateTime, default=datetime.utcnow)


class LibraryFineRecord(Base):
    __tablename__ = "library_fine_records"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("library_issue_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("library_member_records.id", ondelete="CASCADE"), nullable=False, index=True)
    
    fine_type = Column(String(50), default="OVERDUE")
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(SAEnum(FineStatus), default=FineStatus.PENDING, index=True)
    paid_date = Column(Date, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("LibraryIssueTransaction", foreign_keys=[transaction_id])


class LibraryAuditLog(Base):
    __tablename__ = "library_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
