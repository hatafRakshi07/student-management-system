from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


# ==========================================
# PHASE 29 — INVENTORY & ASSET ENUMS & MODELS
# ==========================================

class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    UNDER_REPAIR = "UNDER_REPAIR"
    DISCARDED = "DISCARDED"


class CertificateType(str, enum.Enum):
    BONAFIDE = "BONAFIDE"
    TRANSFER = "TRANSFER"
    CHARACTER = "CHARACTER"
    DEGREE = "DEGREE"
    TRANSCRIPT = "TRANSCRIPT"


class OfferStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    SELECTED = "SELECTED"
    OFFER_ISSUED = "OFFER_ISSUED"


# --- PHASE 29: INVENTORY & ASSET MODELS ---
class InventoryAssetRecord(Base):
    __tablename__ = "inventory_asset_records"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True, index=True, nullable=False)
    barcode_token = Column(String(100), unique=True, index=True, nullable=True)
    qr_code_token = Column(String(100), unique=True, index=True, nullable=True)

    item_name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, default="IT Equipment")
    location = Column(String(100), default="Main Lab 1")
    purchase_price = Column(Float, default=0.0)
    purchase_date = Column(Date, default=date.today)
    warranty_expiry = Column(Date, nullable=True)

    condition = Column(String(50), default="Good")
    status = Column(SAEnum(AssetStatus), default=AssetStatus.AVAILABLE, index=True)
    assigned_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    assigned_user = relationship("User", foreign_keys=[assigned_user_id])


class InventoryMaintenanceLog(Base):
    __tablename__ = "inventory_maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("inventory_asset_records.id", ondelete="CASCADE"), nullable=False, index=True)
    service_details = Column(Text, nullable=False)
    cost = Column(Float, default=0.0)
    service_date = Column(Date, default=date.today)
    vendor_name = Column(String(255), default="Authorized Service Center")

    asset = relationship("InventoryAssetRecord")


# --- PHASE 30: CERTIFICATE & DIGITAL DOCUMENT MODELS ---
class GeneratedCertificate(Base):
    __tablename__ = "generated_certificates"

    id = Column(Integer, primary_key=True, index=True)
    document_number = Column(String(100), unique=True, index=True, nullable=False)
    certificate_type = Column(SAEnum(CertificateType), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)

    verification_token = Column(String(100), unique=True, index=True, nullable=False)
    qr_code_url = Column(String(500), nullable=True)
    issue_date = Column(Date, nullable=False, default=date.today)
    is_valid = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("StudentProfile", foreign_keys=[student_id])


# --- PHASE 31: ALUMNI & PLACEMENT MODELS ---
class PlacementCompany(Base):
    __tablename__ = "placement_companies"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    hr_name = Column(String(255), nullable=True)
    hr_email = Column(String(255), nullable=True)
    hr_phone = Column(String(20), nullable=True)
    industry_type = Column(String(100), default="Information Technology")
    created_at = Column(DateTime, default=datetime.utcnow)


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    drive_title = Column(String(255), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("placement_companies.id", ondelete="CASCADE"), nullable=False, index=True)
    job_role = Column(String(100), nullable=False, default="Software Engineer")
    ctc_package = Column(String(50), default="6.5 LPA")
    drive_date = Column(Date, nullable=False, default=date.today)
    eligibility_cgpa = Column(Float, default=6.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("PlacementCompany")


class PlacementJobOffer(Base):
    __tablename__ = "placement_job_offers"

    id = Column(Integer, primary_key=True, index=True)
    drive_id = Column(Integer, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SAEnum(OfferStatus), default=OfferStatus.APPLIED, index=True)
    ctc_offered = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    drive = relationship("PlacementDrive")
    student = relationship("StudentProfile", foreign_keys=[student_id])


class AlumniProfileRecord(Base):
    __tablename__ = "alumni_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    passing_year = Column(Integer, nullable=False, default=2024)
    current_company = Column(String(255), default="Tata Consultancy Services")
    designation = Column(String(100), default="Senior Systems Engineer")
    linkedin_url = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
