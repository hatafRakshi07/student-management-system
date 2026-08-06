import json
from datetime import datetime, date
from sqlalchemy import func
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import FeeReceipt, FeeSummary, Payment, FeeTransaction, UnmatchedFeeRecord, FeeDiscount, Fee

def run_audit():
    db = SessionLocal()
    report = {
        "phase1_integrity": {},
        "phase2_recalculation": {},
        "repairs_needed": 0
    }
    
    try:
        # --- PHASE 1 AUDIT ---
        total_students = db.query(User).filter(User.role == UserRole.student).count()
        total_summaries = db.query(FeeSummary).count()
        total_receipts = db.query(FeeReceipt).count()
        
        # Check orphan FeeReceipts (receipts linked to non-existent users)
        valid_user_ids = set(u.id for u in db.query(User.id).all())
        receipt_student_ids = set(r.student_id for r in db.query(FeeReceipt.student_id).all())
        orphan_receipts = [sid for sid in receipt_student_ids if sid not in valid_user_ids]
        
        # Check orphan FeeSummaries
        summary_student_ids = set(fs.student_id for fs in db.query(FeeSummary.student_id).all())
        orphan_summaries = [sid for sid in summary_student_ids if sid not in valid_user_ids]
        
        # Check duplicate FeeSummaries
        summary_counts = db.query(FeeSummary.student_id, func.count(FeeSummary.id)).group_by(FeeSummary.student_id).all()
        duplicate_summaries = [sid for sid, cnt in summary_counts if cnt > 1]
        
        # Check students without FeeSummary
        student_user_ids = set(u.id for u in db.query(User.id).filter(User.role == UserRole.student).all())
        students_missing_summary = [sid for sid in student_user_ids if sid not in summary_student_ids]

        report["phase1_integrity"] = {
            "total_students": total_students,
            "total_summaries": total_summaries,
            "total_receipts": total_receipts,
            "orphan_receipt_student_ids": orphan_receipts,
            "orphan_summary_student_ids": orphan_summaries,
            "duplicate_summary_student_ids": duplicate_summaries,
            "students_missing_summary": students_missing_summary
        }

        # --- PHASE 2 RECALCULATION & COMPARISON ---
        paid_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.amount)).group_by(FeeReceipt.student_id).all())
        disc_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.discount)).group_by(FeeReceipt.student_id).all())
        fine_sums = dict(db.query(FeeReceipt.student_id, func.sum(FeeReceipt.fine + FeeReceipt.late_fee)).group_by(FeeReceipt.student_id).all())
        last_pay_dates = dict(db.query(FeeReceipt.student_id, func.max(FeeReceipt.receipt_date)).group_by(FeeReceipt.student_id).all())
        installments_counts = dict(db.query(FeeReceipt.student_id, func.count(FeeReceipt.receipt_id)).group_by(FeeReceipt.student_id).all())
        session_counts = dict(db.query(StudentAcademicHistory.student_id, func.count(StudentAcademicHistory.session)).group_by(StudentAcademicHistory.student_id).all())

        mismatches = []
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

            diff = {}
            if abs(fs.total_paid - calc_paid) > 0.01:
                diff["total_paid"] = (fs.total_paid, calc_paid)
            if abs(fs.discount - calc_disc) > 0.01:
                diff["discount"] = (fs.discount, calc_disc)
            if abs(fs.pending_fee - calc_pending) > 0.01:
                diff["pending_fee"] = (fs.pending_fee, calc_pending)
            if fs.current_status != calc_status:
                diff["current_status"] = (fs.current_status, calc_status)

            if diff:
                mismatches.append({"student_id": sid, "diff": diff})

        report["phase2_recalculation"] = {
            "total_mismatches_found": len(mismatches),
            "mismatch_samples": mismatches[:5]
        }
        report["repairs_needed"] = len(students_missing_summary) + len(mismatches)

        print(json.dumps(report, indent=2, default=str))

    finally:
        db.close()

if __name__ == "__main__":
    run_audit()
