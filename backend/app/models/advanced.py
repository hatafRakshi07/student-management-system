from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


# ==========================================
# PHASE 32-34 ADVANCED ERP ENUMS & MODELS
# ==========================================

class PatentStatus(str, enum.Enum):
    FILED = "FILED"
    PUBLISHED = "PUBLISHED"
    GRANTED = "GRANTED"


class DeviceType(str, enum.Enum):
    FACE_RECOGNITION = "FACE_RECOGNITION"
    FINGERPRINT = "FINGERPRINT"
    RFID_READER = "RFID_READER"


class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"


# --- PHASE 32: RESEARCH MANAGEMENT MODELS ---
class ResearchProject(Base):
    __tablename__ = "research_projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    principal_investigator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    funding_agency = Column(String(255), nullable=False, default="DST-SERB India")
    grant_amount = Column(Float, default=500000.0)
    status = Column(String(50), default="ONGOING")
    start_date = Column(Date, default=date.today)

    created_at = Column(DateTime, default=datetime.utcnow)
    principal_investigator = relationship("User", foreign_keys=[principal_investigator_id])


class ResearchPublication(Base):
    __tablename__ = "research_publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    journal_name = Column(String(255), nullable=False)
    issn_isbn = Column(String(50), nullable=True)
    doi = Column(String(100), nullable=True)
    impact_factor = Column(Float, default=2.5)
    publication_year = Column(Integer, default=2026)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    faculty = relationship("User", foreign_keys=[faculty_user_id])


class ResearchPatent(Base):
    __tablename__ = "research_patents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    application_number = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(SAEnum(PatentStatus), default=PatentStatus.FILED, index=True)
    filing_date = Column(Date, default=date.today)
    faculty_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    faculty = relationship("User", foreign_keys=[faculty_user_id])


# --- PHASE 33: NAAC / NIRF ACCREDITATION MODELS ---
class NAACAQARReport(Base):
    __tablename__ = "naac_aqar_reports"

    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(20), nullable=False, default="2025-26", index=True)
    criterion_1_score = Column(Float, default=3.85)  # Curricular Aspects
    criterion_2_score = Column(Float, default=3.75)  # Teaching-Learning & Evaluation
    criterion_3_score = Column(Float, default=3.60)  # Research & Innovation
    criterion_4_score = Column(Float, default=3.90)  # Infrastructure
    criterion_5_score = Column(Float, default=3.70)  # Student Support
    criterion_6_score = Column(Float, default=3.80)  # Governance & Leadership
    criterion_7_score = Column(Float, default=3.95)  # Institutional Values
    overall_cgpa = Column(Float, default=3.79)       # Grade A++
    created_at = Column(DateTime, default=datetime.utcnow)


class NIRFRankingData(Base):
    __tablename__ = "nirf_ranking_data"

    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(20), nullable=False, default="2025-26", index=True)
    tlr_score = Column(Float, default=82.5)  # Teaching, Learning & Resources
    rp_score = Column(Float, default=74.0)   # Research and Professional Practice
    go_score = Column(Float, default=88.0)   # Graduation Outcomes
    oi_score = Column(Float, default=68.5)   # Outreach and Inclusivity
    perception_score = Column(Float, default=75.0)
    total_nirf_score = Column(Float, default=78.2)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- PHASE 34: BIOMETRIC & RFID MODELS ---
class BiometricDevice(Base):
    __tablename__ = "biometric_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String(50), unique=True, index=True, nullable=False)
    ip_address = Column(String(50), nullable=False)
    location = Column(String(100), default="Main Entrance Gate 1")
    device_type = Column(SAEnum(DeviceType), default=DeviceType.FACE_RECOGNITION)
    status = Column(SAEnum(DeviceStatus), default=DeviceStatus.ONLINE)
    last_sync_time = Column(DateTime, default=datetime.utcnow)

    created_at = Column(DateTime, default=datetime.utcnow)


class BiometricPunchLog(Base):
    __tablename__ = "biometric_logs"

    id = Column(Integer, primary_key=True, index=True)
    device_code = Column(String(50), nullable=False, index=True)
    card_or_user_code = Column(String(50), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    punch_time = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    punch_type = Column(String(10), default="IN")  # IN, OUT
    is_processed = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])
