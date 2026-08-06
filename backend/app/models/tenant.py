from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


# --- PHASE 38: MULTI-CAMPUS / MULTI-TENANT SAAS MODELS ---
class SubscriptionPlan(str, enum.Enum):
    FREE = "FREE"
    STANDARD = "STANDARD"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., AKLANK_MAIN, AKLANK_NORTH
    domain = Column(String(255), unique=True, index=True, nullable=True)
    plan = Column(SAEnum(SubscriptionPlan), default=SubscriptionPlan.ENTERPRISE)
    
    logo_url = Column(String(500), nullable=True)
    theme_color = Column(String(50), default="#4f46e5")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    settings = relationship("TenantSetting", back_populates="tenant", uselist=False)
    subscriptions = relationship("TenantSubscription", back_populates="tenant")


class TenantSetting(Base):
    __tablename__ = "tenant_settings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587)
    sms_gateway_key = Column(String(255), nullable=True)
    payment_gateway_key = Column(String(255), nullable=True)
    max_students_limit = Column(Integer, default=50000)

    tenant = relationship("Tenant", back_populates="settings")


class TenantSubscription(Base):
    __tablename__ = "tenant_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_name = Column(String(50), default="ENTERPRISE")
    billing_cycle = Column(String(20), default="YEARLY")  # MONTHLY, YEARLY
    price = Column(Float, default=150000.0)
    is_active = Column(Boolean, default=True)
    start_date = Column(Date, default=date.today)
    expiry_date = Column(Date, default=lambda: date.today().replace(year=date.today().year + 1))

    tenant = relationship("Tenant", back_populates="subscriptions")


# --- PHASE 39: PUBLIC API PLATFORM & WEBHOOK MODELS ---
class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    key_name = Column(String(100), nullable=False)
    api_key = Column(String(255), unique=True, index=True, nullable=False)
    rate_limit_per_min = Column(Integer, default=500)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    target_url = Column(String(500), nullable=False)
    subscribed_events = Column(String(500), default="STUDENT_CREATED,FEE_PAID,RESULT_PUBLISHED")
    secret_token = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
