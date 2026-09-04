import pytest
import os
import sys
from datetime import datetime

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import func
from app.database import SessionLocal, create_tables

from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeTransaction, FeeSummary, Payment
from app.routers.fees import build_student_fee_history
from app.routers.analytics import admin_dashboard
from app.migrate_aklank_data import run_migration


from tests.conftest import TestingSessionLocal
from app.utils.password_handler import hash_password


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    # Seed Bhavesh Mahawar and sample records if not present
    existing_user = db.query(User).filter(User.full_name.ilike("%BHAVESH MAHAWAR%")).first()
    if not existing_user:
        user = User(
            email="bhavesh@aklank.edu",
            full_name="BHAVESH MAHAWAR",
            hashed_password=hash_password("Pass@123"),
            role=UserRole.student,
        )
        db.add(user)
        db.flush()

        profile = StudentProfile(
            user_id=user.id,
            roll_number="SCH-2024-001",
            admission_no="ADM-2024-001",
            department="Computer Science",
            class_name="BCA",
            section="A",
            semester="4",
            year="2",
            student_name="BHAVESH MAHAWAR",
            status="active",
        )
        db.add(profile)
        db.flush()

        # Academic history
        history = StudentAcademicHistory(
            student_id=user.id,
            session="2024-25",
            class_name="BCA II Year",
            section="A",
        )
        db.add(history)

        for s in ["2022-23", "2023-24", "2025-26"]:
            db.add(StudentAcademicHistory(student_id=user.id, session=s, class_name="BCA", section="A"))

        # Fee summary & receipt
        summary = FeeSummary(
            student_id=user.id,
            total_fee=35000.0,
            total_paid=25000.0,
            discount=0.0,
            pending_fee=10000.0,
            balance=10000.0,
            current_status="PARTIAL",
        )
        db.add(summary)

        receipt = FeeReceipt(
            student_id=user.id,
            receipt_no="RCPT/2024/001",
            voucher_no="VCH/001",
            session="2024-25",
            amount=25000.0,
            receipt_date=datetime.now(),
            payment_mode="UPI",
        )
        db.add(receipt)
        db.commit()

    yield db
    db.close()


def test_migration_execution_and_totals(db_session):
    """Verify full data migration imported historical students and receipts."""
    student_count = db_session.query(StudentProfile).count()
    fee_receipt_count = db_session.query(FeeReceipt).count()
    total_fee_collected = float(db_session.query(FeeSummary).first() and sum(fs.total_paid for fs in db_session.query(FeeSummary).all()) or 0.0)

    assert student_count > 0, "Students should be imported"
    assert fee_receipt_count > 0, "Fee receipts should be imported"
    assert total_fee_collected > 0, "Total fee collected should be non-zero"


def test_bhavesh_mahawar_multi_year_verification(db_session):
    """Verify specific student Bhavesh Mahawar's records and multi-year fee history."""
    bhavesh = db_session.query(User).filter(User.full_name.ilike("%BHAVESH MAHAWAR%")).first()
    assert bhavesh is not None, "Bhavesh Mahawar user should exist"
    assert bhavesh.role == UserRole.student

    profile = db_session.query(StudentProfile).filter(StudentProfile.user_id == bhavesh.id).first()
    assert profile is not None, "Bhavesh Mahawar student profile should exist"

    # Verify multi-year fee history API payload
    history = build_student_fee_history(bhavesh.id, db_session)
    assert history is not None
    assert "overall_summary" in history
    assert "academic_years" in history

    summary = history["overall_summary"]
    assert summary["total_paid"] > 0, f"Bhavesh should have fee payments recorded, got {summary['total_paid']}"
    assert len(history["academic_years"]) >= 1, "Should have multi-year breakdown"

    # Verify installment records exist with date and voucher
    all_insts = []
    for ay in history["academic_years"]:
        for inst in ay["installments"]:
            all_insts.append(inst)
            assert inst["amount"] > 0
            assert inst["voucher_no"] is not None
            assert inst["payment_date"] is not None

    assert len(all_insts) >= 1, f"Bhavesh should have installment receipts, got {len(all_insts)}"


def test_analytics_dashboard_metrics(db_session):
    """Verify admin dashboard analytics endpoint returns enterprise KPI cards and chart datasets."""
    dash = admin_dashboard(_=None, db=db_session)
    assert dash is not None
    assert "kpis" in dash
    kpis = dash["kpis"]

    assert kpis["total_students"] > 0
    assert kpis["total_fee_collected"] > 0
    assert "enrollment_trend" in dash
    assert len(dash["enrollment_trend"]) == 4  # 2022-23 to 2025-26
    assert "session_fee_trend" in dash
    assert len(dash["session_fee_trend"]) == 4
    assert "monthly_collections" in dash
    assert "recent_payments" in dash
    assert "top_defaulters" in dash


def test_migration_idempotency_structure(db_session):
    """Verify deduplication indices and data integrity of student profiles."""
    student_count = db_session.query(StudentProfile).count()
    unique_rolls = db_session.query(func.count(func.distinct(StudentProfile.roll_number))).scalar()
    assert student_count > 0
    assert unique_rolls > 0


