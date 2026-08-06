from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import secrets

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.fee import FeeSummary
from app.models.tenant import Tenant, TenantSetting, TenantSubscription, APIKey, WebhookEndpoint, SubscriptionPlan
from app.utils.auth_deps import require_admin, get_current_user

router = APIRouter(prefix="/api", tags=["Multi-Campus Enterprise SaaS & Public API Gateway"])


# --- PYDANTIC REQUEST SCHEMAS ---
class CreateTenantRequest(BaseModel):
    name: str
    code: str
    domain: Optional[str] = None
    plan: Optional[str] = "ENTERPRISE"
    theme_color: Optional[str] = "#4f46e5"

class GenerateAPIKeyRequest(BaseModel):
    key_name: str
    tenant_id: Optional[int] = 1

class SubscribeWebhookRequest(BaseModel):
    target_url: str
    events: Optional[str] = "STUDENT_CREATED,FEE_PAID,RESULT_PUBLISHED"
    tenant_id: Optional[int] = 1


# ==========================================
# PHASE 38 — MULTI-CAMPUS SAAS ENDPOINTS
# ==========================================
@router.get("/tenants/list")
def list_tenants(db: Session = Depends(get_db)):
    """Phase 38: List All Provisioned College Campus Tenants."""
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()
    if not tenants:
        # Seed Main Campus Tenant
        t_main = Tenant(
            name="Aklank College Main Campus (Kota)",
            code="AKLANK_MAIN",
            domain="main.aklankerp.edu.in",
            plan=SubscriptionPlan.ENTERPRISE,
            theme_color="#4f46e5",
            is_active=True
        )
        db.add(t_main)
        db.commit()
        db.refresh(t_main)
        
        db.add(TenantSetting(tenant_id=t_main.id, smtp_host="smtp.aklankerp.edu.in"))
        db.add(TenantSubscription(tenant_id=t_main.id, plan_name="ENTERPRISE", price=250000.0))
        db.commit()
        tenants = [t_main]

    t_list = []
    for t in tenants:
        t_list.append({
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "domain": t.domain,
            "plan": t.plan.value if hasattr(t.plan, 'value') else str(t.plan),
            "theme_color": t.theme_color,
            "is_active": t.is_active
        })

    return {"count": len(t_list), "tenants": t_list}


@router.post("/tenants/create")
def create_tenant(payload: CreateTenantRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Phase 38: Provision New College Campus Tenant."""
    existing = db.query(Tenant).filter(Tenant.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant code already exists")

    new_t = Tenant(
        name=payload.name,
        code=payload.code.upper(),
        domain=payload.domain or f"{payload.code.lower()}.aklankerp.edu.in",
        plan=SubscriptionPlan.ENTERPRISE,
        theme_color=payload.theme_color,
        is_active=True
    )
    db.add(new_t)
    db.commit()
    db.refresh(new_t)

    db.add(TenantSetting(tenant_id=new_t.id))
    db.add(TenantSubscription(tenant_id=new_t.id, plan_name=payload.plan, price=180000.0))
    db.commit()

    return {
        "message": "Campus Tenant Provisioned Successfully!",
        "tenant": {
            "id": new_t.id,
            "name": new_t.name,
            "code": new_t.code,
            "domain": new_t.domain,
            "plan": "ENTERPRISE"
        }
    }


@router.get("/tenants/super-admin/dashboard")
def get_super_admin_tenants_dashboard(db: Session = Depends(get_db)):
    """Phase 38: Cross-Campus Super Admin Command Center Dashboard."""
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).count()
    total_students = db.query(StudentProfile).count()
    total_revenue = db.query(func.sum(FeeSummary.total_paid)).scalar() or 0.0

    return {
        "total_campuses": total_tenants or 1,
        "active_tenants": active_tenants or 1,
        "total_enrolled_students": total_students,
        "cross_campus_revenue_realized": float(total_revenue),
        "license_status": "ENTERPRISE_UNLIMITED_v1.0.0",
        "supported_features": ["MULTI_TENANT", "PUBLIC_API", "WEBHOOKS", "DEVOPS_K8S"]
    }


# ==========================================
# PHASE 39 — PUBLIC API & WEBHOOK PLATFORM
# ==========================================
@router.post("/developer/api-keys/generate")
def generate_developer_api_key(payload: GenerateAPIKeyRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Phase 39: Issue Bearer API Key for Third-Party Integrations."""
    raw_key = f"akl_live_{secrets.token_hex(24)}"
    key_obj = APIKey(
        tenant_id=payload.tenant_id or 1,
        key_name=payload.key_name,
        api_key=raw_key,
        rate_limit_per_min=1000,
        is_active=True
    )
    db.add(key_obj)
    db.commit()

    return {
        "message": "Developer API Key Issued Successfully!",
        "key_name": payload.key_name,
        "api_key": raw_key,
        "rate_limit_per_min": 1000
    }


@router.post("/developer/webhooks/subscribe")
def subscribe_webhook_endpoint(payload: SubscribeWebhookRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Phase 39: Register Webhook Target URL for Real-Time Event Streams."""
    wh_secret = f"whsec_{secrets.token_hex(16)}"
    wh = WebhookEndpoint(
        tenant_id=payload.tenant_id or 1,
        target_url=payload.target_url,
        subscribed_events=payload.events,
        secret_token=wh_secret,
        is_active=True
    )
    db.add(wh)
    db.commit()

    return {
        "message": "Webhook Subscription Activated Successfully!",
        "target_url": payload.target_url,
        "subscribed_events": payload.events.split(","),
        "webhook_secret": wh_secret
    }


@router.get("/developer/openapi-spec")
def export_openapi_spec():
    """Phase 39: OpenAPI 3.0 Specification Metadata."""
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "College ERP Enterprise API Gateway Platform",
            "version": "1.0.0",
            "description": "Production REST & Webhook APIs for Student, Fee, Attendance, Exam, HR, LMS, Library & Analytics Integrations."
        },
        "supported_events": [
            "STUDENT_CREATED", "ADMISSION_APPROVED", "FEE_PAID",
            "ATTENDANCE_MARKED", "RESULT_PUBLISHED", "CERTIFICATE_GENERATED"
        ]
    }
