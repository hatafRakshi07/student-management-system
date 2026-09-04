from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


class EventType(str, enum.Enum):
    FRESHER_PARTY = "FRESHER_PARTY"
    FAREWELL_PARTY = "FAREWELL_PARTY"
    ANNUAL_FEST = "ANNUAL_FEST"
    SPORTS_MEET = "SPORTS_MEET"
    CULTURAL_NIGHT = "CULTURAL_NIGHT"
    TECHNICAL_SYMPOSIUM = "TECHNICAL_SYMPOSIUM"
    WORKSHOP = "WORKSHOP"
    SEMINAR = "SEMINAR"
    OTHER = "OTHER"


class EventStatus(str, enum.Enum):
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    SETTLED = "SETTLED"
    CANCELLED = "CANCELLED"


class EntryType(str, enum.Enum):
    INCOME = "INCOME"       # Collections, student contribution, sponsorships, college grants
    EXPENSE = "EXPENSE"     # Catering, DJ/Sound, Decoration, Stage, Gifts, Photography


class CollegeEvent(Base):
    __tablename__ = "college_events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    event_type = Column(String(50), default=EventType.FRESHER_PARTY.value)
    academic_year = Column(String(20), default="2026-27")
    target_budget = Column(Float, default=0.0)
    event_date = Column(Date, default=date.today)
    venue = Column(String(150), nullable=True)
    coordinator_name = Column(String(100), nullable=True)
    coordinator_contact = Column(String(50), nullable=True)
    status = Column(String(30), default=EventStatus.UPCOMING.value)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("EventLedgerItem", back_populates="event", cascade="all, delete-orphan")


class EventLedgerItem(Base):
    __tablename__ = "event_ledger_items"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("college_events.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(200), nullable=False)
    entry_type = Column(String(20), nullable=False)  # INCOME or EXPENSE
    category = Column(String(100), nullable=False)   # Catering, DJ/Sound, Decoration, Student Contribution, Sponsorship, etc.
    amount = Column(Float, nullable=False)
    
    payee_or_donor = Column(String(150), nullable=True) # e.g. "DJ Ronit", "Sharma Catering", "Student Pass Sales"
    payment_mode = Column(String(50), default="UPI")     # CASH, UPI, BANK_TRANSFER, CHEQUE
    reference_no = Column(String(100), nullable=True)    # Bill No / UTR / Receipt No
    receipt_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    item_date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("CollegeEvent", back_populates="items")
