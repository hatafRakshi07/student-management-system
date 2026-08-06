from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum as SAEnum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, date
import enum
from app.database import Base


# --- PHASE 35: MOBILE PLATFORM MODELS ---
class MobileDeviceToken(Base):
    __tablename__ = "mobile_device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_token = Column(String(500), unique=True, index=True, nullable=False)
    platform = Column(String(20), default="ANDROID")  # ANDROID, IOS, WEB
    biometrics_enabled = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])


# --- PHASE 36: AI ASSISTANT MODELS ---
class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_query = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    detected_intent = Column(String(100), default="GENERAL_QUERY")

    timestamp = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", foreign_keys=[user_id])


# --- PHASE 37: PREDICTIVE ANALYTICS MODELS ---
class AIPredictionLog(Base):
    __tablename__ = "ai_prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(String(100), nullable=False, index=True)  # DROPOUT_RISK, FEE_FORECAST, PLACEMENT_READINESS
    target_entity_id = Column(Integer, nullable=True)             # e.g., Student ID
    prediction_score = Column(Float, nullable=False)               # Risk score or forecast value
    confidence_level = Column(Float, default=0.92)
    recommendation = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
