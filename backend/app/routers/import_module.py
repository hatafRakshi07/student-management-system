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
        "pending_fees": max(0.0, 15000.0 * total_students - total_paid_amount - total_discount_amount), # Estimated base fee
        "discount_amount": total_discount_amount,
        "refund_amount": total_refund_amount,
        "cancelled_receipts": cancelled_count,
        "cancelled_amount": cancelled_amount,
        "student_fee_summary": student_summary
    }
