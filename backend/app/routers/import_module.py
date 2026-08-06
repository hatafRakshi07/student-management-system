from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import Optional, Dict, Any
from datetime import datetime, date

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.fee import FeeTransaction, UnmatchedFeeRecord, ImportLog, FeeDiscount
from app.utils.auth_deps import require_teacher_or_admin
from app.services.import_service import run_full_import

router = APIRouter(prefix="/api/import", tags=["Import Module"])


@router.post("/run")
def trigger_import(
    excel_path: Optional[str] = None,
    csv_path: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    """Run full student master and fee transaction import."""
    kwargs = {}
    if excel_path:
        kwargs["excel_path"] = excel_path
    if csv_path:
        kwargs["csv_path"] = csv_path

    report = run_full_import(db=db, **kwargs)
    return {"message": "Import completed successfully", "report": report}


@router.get("/latest-report")
def get_latest_import_report(
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    """Fetch the latest import log and detailed execution report."""
    log = db.query(ImportLog).order_by(ImportLog.id.desc()).first()
    if not log:
        return {"report": None}
    return {
        "id": log.id,
        "import_type": log.import_type,
        "status": log.status,
        "student_records_found": log.student_records_found,
        "students_imported": log.students_imported,
        "students_updated": log.students_updated,
        "users_created": log.users_created,
        "duplicate_usernames_fixed": log.duplicate_usernames_fixed,
        "fee_records_found": log.fee_records_found,
        "fee_transactions_imported": log.fee_transactions_imported,
        "fee_transactions_updated": log.fee_transactions_updated,
        "duplicate_receipts_updated": log.duplicate_receipts_updated,
        "unmatched_fee_records": log.unmatched_fee_records,
        "failed_records": log.failed_records,
        "start_time": log.start_time,
        "end_time": log.end_time,
        "report_summary": log.report_summary
    }


@router.get("/unmatched-fees")
def get_unmatched_fee_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    """Get list of fee records that could not be matched to a student master record."""
    total = db.query(UnmatchedFeeRecord).count()
    records = db.query(UnmatchedFeeRecord).offset(skip).limit(limit).all()
    return {
        "total": total,
        "records": [
            {
                "id": r.id,
                "receipt_number": r.receipt_number,
                "reg_no": r.reg_no,
                "student_name": r.student_name,
                "class_name": r.class_name,
                "paid_amount": r.paid_amount,
                "payment_mode": r.payment_mode,
                "created_at": r.created_at
            }
            for r in records
        ]
    }


@router.get("/dashboard-metrics")
def get_import_dashboard_metrics(
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    """
    Computes all required live metrics after data import:
    - Total Students, New Students, Old Students
    - Today's Collection, Monthly Collection, Yearly Collection
    - Total Fees Collected, Pending Fees, Paid Fees, Discount Amount, Refund Amount
    - Cancelled Receipts Count & Cancelled Amount
    - Student-wise Fee Summary
    """
    now = datetime.utcnow()
    today_date = now.date()

    total_students = db.query(StudentProfile).count()
    new_students = db.query(StudentProfile).filter(StudentProfile.student_type.ilike("%NEW%")).count()
    old_students = db.query(StudentProfile).filter(StudentProfile.student_type.ilike("%OLD%")).count()

    # Valid non-cancelled fee transactions
    valid_txns = db.query(FeeTransaction).filter(FeeTransaction.cancelled_status != "Y")

    total_paid_amount = valid_txns.with_entities(func.sum(FeeTransaction.paid_amount)).scalar() or 0.0
    total_discount_amount = valid_txns.with_entities(func.sum(FeeTransaction.discount_amount)).scalar() or 0.0
    total_refund_amount = valid_txns.with_entities(func.sum(FeeTransaction.refund_amount)).scalar() or 0.0

    # Today's Collection
    today_collection = db.query(func.sum(FeeTransaction.paid_amount)).filter(
        FeeTransaction.cancelled_status != "Y",
        func.date(FeeTransaction.voucher_date) == today_date
    ).scalar() or 0.0

    # Monthly Collection (current month)
    monthly_collection = db.query(func.sum(FeeTransaction.paid_amount)).filter(
        FeeTransaction.cancelled_status != "Y",
        extract('month', FeeTransaction.voucher_date) == now.month,
        extract('year', FeeTransaction.voucher_date) == now.year
    ).scalar() or 0.0

    # Yearly Collection (current year)
    yearly_collection = db.query(func.sum(FeeTransaction.paid_amount)).filter(
        FeeTransaction.cancelled_status != "Y",
        extract('year', FeeTransaction.voucher_date) == now.year
    ).scalar() or 0.0

    # Cancelled receipts
    cancelled_txns = db.query(FeeTransaction).filter(FeeTransaction.cancelled_status == "Y")
    cancelled_count = cancelled_txns.count()
    cancelled_amount = cancelled_txns.with_entities(func.sum(FeeTransaction.paid_amount)).scalar() or 0.0

    # Student-wise Fee Summary
    # Group fee transactions by student_id / reg_no
    student_summary = []
    summaries_query = db.query(
        FeeTransaction.reg_no,
        FeeTransaction.student_name,
        FeeTransaction.class_name,
        func.sum(FeeTransaction.paid_amount).label("total_paid"),
        func.sum(FeeTransaction.discount_amount).label("total_discount"),
        func.count(FeeTransaction.id).label("transaction_count")
    ).filter(FeeTransaction.cancelled_status != "Y").group_by(
        FeeTransaction.reg_no, FeeTransaction.student_name, FeeTransaction.class_name
    ).limit(50).all()

    for s in summaries_query:
        student_summary.append({
            "reg_no": s.reg_no,
            "student_name": s.student_name,
            "class_name": s.class_name,
            "total_paid": s.total_paid or 0.0,
            "total_discount": s.total_discount or 0.0,
            "transaction_count": s.transaction_count
        })

    return {
        "total_students": total_students,
        "new_students": new_students,
        "old_students": old_students if old_students > 0 else (total_students - new_students),
        "today_collection": today_collection,
        "monthly_collection": monthly_collection,
        "yearly_collection": yearly_collection,
        "total_fees_collected": total_paid_amount,
        "paid_fees": total_paid_amount,
        "pending_fees": max(0.0, 15000.0 * total_students - total_paid_amount - total_discount_amount),
        "discount_amount": total_discount_amount,
        "refund_amount": total_refund_amount,
        "cancelled_receipts": cancelled_count,
        "cancelled_amount": cancelled_amount,
        "student_fee_summary": student_summary
    }


@router.get("/ai-analytics")
def get_ai_analytics_report(
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin)
):
    """
    Step 18 AI Features:
    - Student Fee Status Summary
    - Pending Fee Alerts & Top Defaulters
    - Class Collection Reports
    - Session Comparison
    - Admission & Revenue Trends
    - Payment Mode Analytics
    """
    from app.models.fee import FeeSummary, FeeReceipt
    from app.models.student import StudentAcademicHistory

    # 1. Student Fee Status Distribution
    status_counts = db.query(
        FeeSummary.current_status, func.count(FeeSummary.id)
    ).group_by(FeeSummary.current_status).all()

    status_summary = {st: count for st, count in status_counts}

    # 2. Top Defaulters (highest pending balance)
    defaulters_query = db.query(
        FeeSummary.student_id,
        User.full_name,
        StudentProfile.roll_number,
        StudentProfile.class_name,
        FeeSummary.pending_fee,
        FeeSummary.total_paid
    ).join(User, FeeSummary.student_id == User.id)\
     .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
     .filter(FeeSummary.pending_fee > 0)\
     .order_by(FeeSummary.pending_fee.desc()).limit(10).all()

    top_defaulters = [
        {
            "student_id": d.student_id,
            "name": d.full_name,
            "scholar_no": d.roll_number,
            "class_name": d.class_name,
            "pending_fee": d.pending_fee,
            "total_paid": d.total_paid
        }
        for d in defaulters_query
    ]

    # 3. Class Collection Reports
    class_collection = db.query(
        StudentProfile.class_name,
        func.sum(FeeReceipt.amount).label("collected"),
        func.count(FeeReceipt.receipt_id).label("receipts_count")
    ).join(User, StudentProfile.user_id == User.id)\
     .join(FeeReceipt, User.id == FeeReceipt.student_id)\
     .group_by(StudentProfile.class_name).all()

    class_reports = [
        {
            "class_name": c.class_name or "Unassigned",
            "collected_amount": c.collected or 0.0,
            "receipts_count": c.receipts_count
        }
        for c in class_collection
    ]

    # 4. Session Comparison
    session_comparison = db.query(
        FeeReceipt.session,
        func.sum(FeeReceipt.amount).label("collected_amount"),
        func.count(FeeReceipt.receipt_id).label("total_receipts")
    ).group_by(FeeReceipt.session).all()

    session_reports = [
        {
            "session": s.session or "2023-24",
            "collected_amount": s.collected_amount or 0.0,
            "total_receipts": s.total_receipts
        }
        for s in session_comparison
    ]

    # 5. Payment Mode Analytics
    mode_analytics = db.query(
        FeeReceipt.payment_mode,
        func.sum(FeeReceipt.amount).label("total_amount"),
        func.count(FeeReceipt.receipt_id).label("count")
    ).group_by(FeeReceipt.payment_mode).all()

    payment_analytics = [
        {
            "payment_mode": m.payment_mode or "CASH",
            "total_amount": m.total_amount or 0.0,
            "count": m.count
        }
        for m in mode_analytics
    ]

    return {
        "status": "SUCCESS",
        "fee_status_summary": status_summary,
        "top_defaulters": top_defaulters,
        "class_collection_reports": class_reports,
        "session_comparison": session_reports,
        "payment_analytics": payment_analytics
    }

