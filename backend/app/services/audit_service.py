import json
from datetime import datetime, date
from typing import Dict, Any, List
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeSummary, Payment, FeeTransaction, UnmatchedFeeRecord, FeeDiscount, ImportLog

def verify_and_repair_fee_data(db: Session) -> Dict[str, Any]:
    """
    Phases 1 & 2 Audit & Auto-Repair Engine.
    Verifies every FeeReceipt is linked to a valid Student, enforces 1:1 FeeSummary mapping,
    eliminates duplicates, and recalculates every student's FeeSummary from FeeReceipt records.
    Repairs any mismatches automatically.
    """
    report = {
        "status": "COMPLETED",
        "timestamp": datetime.utcnow().isoformat(),
        "phase1_integrity": {},
        "phase2_recalculation": {},
        "repairs_executed": 0,
        "details": []
    }

    # --- PHASE 1: DATA INTEGRITY ---
    all_students = db.query(User).filter(User.role == UserRole.student).all()
    student_user_ids = {u.id for u in all_students}
    valid_user_ids = {u.id for u in db.query(User.id).all()}

    # 1. Orphan FeeReceipts (receipts with non-existent user_id)
    admin_user = db.query(User).filter(User.role == UserRole.admin).first()
    orphan_receipts = db.query(FeeReceipt).filter(~FeeReceipt.student_id.in_(valid_user_ids)).all()
    orphan_receipt_count = len(orphan_receipts)
    if orphan_receipts and admin_user:
        for r in orphan_receipts:
            r.student_id = admin_user.id
            report["repairs_executed"] += 1
        db.flush()

    # 2. Orphan FeeSummaries
    orphan_summaries = db.query(FeeSummary).filter(~FeeSummary.student_id.in_(valid_user_ids)).all()
    orphan_summary_count = len(orphan_summaries)
    if orphan_summaries:
        for fs in orphan_summaries:
            db.delete(fs)
            report["repairs_executed"] += 1
        db.flush()

    # 3. Duplicate FeeSummaries per student
    duplicate_summary_count = 0
    summary_counts = db.query(FeeSummary.student_id, func.count(FeeSummary.id)).group_by(FeeSummary.student_id).all()
    for sid, cnt in summary_counts:
        if cnt > 1:
            duplicate_summary_count += (cnt - 1)
            all_fs = db.query(FeeSummary).filter(FeeSummary.student_id == sid).order_by(FeeSummary.id.asc()).all()
            for extra_fs in all_fs[1:]:
                db.delete(extra_fs)
                report["repairs_executed"] += 1
    db.flush()

    # 4. Students missing FeeSummary
    summary_student_ids = {fs.student_id for fs in db.query(FeeSummary.student_id).all()}
    missing_students = student_user_ids - summary_student_ids
    for sid in missing_students:
        new_fs = FeeSummary(
            student_id=sid,
            total_fee=15000.0,
            total_paid=0.0,
            discount=0.0,
            pending_fee=15000.0,
            current_status="UNPAID",
            updated_at=datetime.utcnow()
        )
        db.add(new_fs)
        report["repairs_executed"] += 1
    db.flush()

    report["phase1_integrity"] = {
        "total_students": len(student_user_ids),
        "total_receipts": db.query(FeeReceipt).count(),
        "orphan_receipts_repaired": orphan_receipt_count,
        "orphan_summaries_deleted": orphan_summary_count,
        "duplicate_summaries_removed": duplicate_summary_count,
        "missing_summaries_created": len(missing_students)
    }

    # --- PHASE 2: TOTALS RECALCULATION & AUTO-REPAIR ---
    paid_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.amount)).group_by(FeeReceipt.student_id).all())
    disc_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.discount)).group_by(FeeReceipt.student_id).all())
    fine_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.fine + FeeReceipt.late_fee)).group_by(FeeReceipt.student_id).all())
    last_pay_dates = dict(db.query(FeeReceipt.student_id, func.max(FeeReceipt.receipt_date)).group_by(FeeReceipt.student_id).all())
    installments_counts = dict(db.query(FeeReceipt.student_id, func.count(FeeReceipt.receipt_id)).group_by(FeeReceipt.student_id).all())
    session_counts = dict(db.query(StudentAcademicHistory.student_id, func.count(StudentAcademicHistory.session)).group_by(StudentAcademicHistory.student_id).all())

    mismatches_repaired = 0
    all_summaries = db.query(FeeSummary).all()

    for fs in all_summaries:
        sid = fs.student_id
        calc_paid = float(paid_sums.get(sid) or 0.0)
        calc_disc = float(disc_sums.get(sid) or 0.0)
        calc_fine = float(fine_sums.get(sid) or 0.0)
        last_date = last_pay_dates.get(sid)
        inst_cnt = int(installments_counts.get(sid) or 0)
        sess_cnt = int(session_counts.get(sid) or 1)

        calc_total_fee = float(sess_cnt * 15000.0)
        calc_pending = max(0.0, calc_total_fee + calc_fine - calc_paid - calc_disc)

        if calc_pending <= 0 and calc_paid > 0:
            calc_status = "PAID"
        elif calc_paid > 0:
            calc_status = "PARTIAL"
        else:
            calc_status = "UNPAID"

        needs_update = (
            abs(fs.total_fee - calc_total_fee) > 0.01 or
            abs(fs.total_paid - calc_paid) > 0.01 or
            abs(fs.discount - calc_disc) > 0.01 or
            abs(fs.pending_fee - calc_pending) > 0.01 or
            fs.current_status != calc_status or
            fs.last_payment_date != last_date or
            fs.installments_paid != inst_cnt
        )

        if needs_update:
            fs.total_fee = calc_total_fee
            fs.total_paid = calc_paid
            fs.discount = calc_disc
            fs.pending_fee = calc_pending
            fs.balance = calc_pending
            fs.last_payment_date = last_date
            fs.installments_paid = inst_cnt
            fs.current_status = calc_status
            fs.updated_at = datetime.utcnow()
            mismatches_repaired += 1
            report["repairs_executed"] += 1

    db.commit()

    report["phase2_recalculation"] = {
        "total_summaries_audited": len(all_summaries),
        "mismatches_repaired": mismatches_repaired
    }

    return report
