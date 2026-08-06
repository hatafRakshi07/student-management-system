from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile, StudentAcademicHistory
from app.models.fee import Fee, FeeStatus, FeeReceipt, FeeSummary, FeeTransaction, Payment, UnmatchedFeeRecord
from app.schemas.fee import FeeCreate, FeeUpdate
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/fees", tags=["Fees"])


@router.get("")
def list_all_fees(
    search: Optional[str] = None,
    student_name: Optional[str] = None,
    scholar_no: Optional[str] = None,
    voucher_no: Optional[str] = None,
    receipt_no: Optional[str] = None,
    father_name: Optional[str] = None,
    mobile: Optional[str] = None,
    class_name: Optional[str] = None,
    course: Optional[str] = None,
    session: Optional[str] = None,
    payment_mode: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phases 5 & 6: Production Multi-Criteria Search & Filtering for Fee Receipts.
    Searches by Student Name, Scholar No, Reg No, Voucher No, Receipt No, Father Name, Mobile, Class, Course, Session.
    Filters by Session, Course, Class, Section, Payment Mode, Date Range, Status (PAID/UNPAID/PARTIAL).
    """
    q = db.query(FeeReceipt, User, StudentProfile)\
        .join(User, FeeReceipt.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)

    # General Search Query
    if search:
        s_like = f"%{search}%"
        q = q.filter(
            User.full_name.ilike(s_like) |
            User.phone.ilike(s_like) |
            StudentProfile.roll_number.ilike(s_like) |
            StudentProfile.reg_no.ilike(s_like) |
            StudentProfile.father_name.ilike(s_like) |
            StudentProfile.student_name.ilike(s_like) |
            FeeReceipt.receipt_no.ilike(s_like) |
            FeeReceipt.voucher_no.ilike(s_like) |
            StudentProfile.class_name.ilike(s_like) |
            StudentProfile.department.ilike(s_like)
        )

    # Specific Criteria Filters
    if student_name:
        q = q.filter(User.full_name.ilike(f"%{student_name}%") | StudentProfile.student_name.ilike(f"%{student_name}%"))
    if scholar_no:
        q = q.filter(StudentProfile.roll_number.ilike(f"%{scholar_no}%") | StudentProfile.reg_no.ilike(f"%{scholar_no}%"))
    if voucher_no:
        q = q.filter(FeeReceipt.voucher_no.ilike(f"%{voucher_no}%"))
    if receipt_no:
        q = q.filter(FeeReceipt.receipt_no.ilike(f"%{receipt_no}%"))
    if father_name:
        q = q.filter(StudentProfile.father_name.ilike(f"%{father_name}%"))
    if mobile:
        q = q.filter(User.phone.ilike(f"%{mobile}%") | StudentProfile.mobile.ilike(f"%{mobile}%") | StudentProfile.father_mobile.ilike(f"%{mobile}%"))
    if class_name:
        q = q.filter(StudentProfile.class_name.ilike(f"%{class_name}%"))
    if course:
        q = q.filter(StudentProfile.department.ilike(f"%{course}%"))
    if session:
        q = q.filter(FeeReceipt.session == session)
    if payment_mode:
        q = q.filter(FeeReceipt.payment_mode.ilike(f"%{payment_mode}%"))

    if start_date:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            q = q.filter(FeeReceipt.receipt_date >= s_dt)
        except ValueError:
            pass
    if end_date:
        try:
            e_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            q = q.filter(FeeReceipt.receipt_date < e_dt)
        except ValueError:
            pass

    total_count = q.count()
    results = q.order_by(FeeReceipt.receipt_id.desc()).offset(skip).limit(limit).all()

    fee_list = []
    for rcpt, u, sp in results:
        fee_list.append({
            "id": rcpt.receipt_id,
            "receipt_id": rcpt.receipt_id,
            "student_id": u.id,
            "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "father_name": sp.father_name if sp else None,
            "scholar_no": sp.roll_number if sp else None,
            "class_name": sp.class_name if sp else None,
            "course": sp.department if sp else None,
            "receipt_no": rcpt.receipt_no or str(rcpt.receipt_id),
            "voucher_no": rcpt.voucher_no or str(rcpt.receipt_id),
            "amount": rcpt.amount or 0.0,
            "discount": rcpt.discount or 0.0,
            "fine": rcpt.fine + rcpt.late_fee,
            "fee_type": f"Fee Receipt #{rcpt.receipt_no or rcpt.receipt_id}",
            "payment_mode": rcpt.payment_mode or "CASH",
            "bank_name": rcpt.bank_name,
            "status": "paid",
            "due_date": (rcpt.receipt_date or rcpt.created_at).isoformat() if (rcpt.receipt_date or rcpt.created_at) else None,
            "payment_date": (rcpt.receipt_date or rcpt.created_at).isoformat() if (rcpt.receipt_date or rcpt.created_at) else None,
            "session": rcpt.session or "2024-25",
            "remarks": rcpt.remarks,
            "created_by": rcpt.created_by or "System Administrator"
        })

    return {
        "total_count": total_count,
        "skip": skip,
        "limit": limit,
        "fees": fee_list
    }


@router.get("/stats")
def fee_stats(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """
    Phase 4: Complete Admin Fee Dashboard Metrics & Analytics.
    Includes Today's, Yesterday's, Monthly, and Yearly Collections, Mode breakdowns (Cash/Online/NEFT/Cheque),
    Top Defaulters, Highest Fee Paid student, and Collection Trends graphs.
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    yesterday_start = today_start - timedelta(days=1)
    month_start = datetime(now.year, now.month, 1)
    year_start = datetime(now.year, 1, 1)

    # Collection Timeframes
    today_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= today_start).scalar() or 0.0
    yesterday_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= yesterday_start, FeeReceipt.receipt_date < today_start).scalar() or 0.0
    monthly_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= month_start).scalar() or 0.0
    yearly_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= year_start).scalar() or 0.0

    # Payment Mode Breakdown
    cash_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%CASH%")).scalar() or 0.0
    online_coll = db.query(func.sum(FeeReceipt.amount)).filter(or_(FeeReceipt.payment_mode.ilike("%ONLINE%"), FeeReceipt.payment_mode.ilike("%UPI%"), FeeReceipt.payment_mode.ilike("%CARD%"))).scalar() or 0.0
    cheque_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%CHEQUE%")).scalar() or 0.0
    neft_coll = db.query(func.sum(FeeReceipt.amount)).filter(or_(FeeReceipt.payment_mode.ilike("%NEFT%"), FeeReceipt.payment_mode.ilike("%RTGS%"), FeeReceipt.payment_mode.ilike("%BANK%"))).scalar() or 0.0

    # Overall Summary Metrics
    total_fee = db.query(func.sum(FeeSummary.total_fee)).scalar() or 0.0
    total_paid = db.query(func.sum(FeeSummary.total_paid)).scalar() or 0.0
    total_pending = db.query(func.sum(FeeSummary.pending_fee)).scalar() or 0.0

    count_paid = db.query(FeeSummary).filter(FeeSummary.current_status == "PAID").count()
    count_unpaid = db.query(FeeSummary).filter(FeeSummary.current_status == "UNPAID").count()
    count_partial = db.query(FeeSummary).filter(FeeSummary.current_status == "PARTIAL").count()

    # Top Defaulters (highest pending fee)
    defaulters_q = db.query(FeeSummary, User, StudentProfile)\
        .join(User, FeeSummary.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
        .filter(FeeSummary.pending_fee > 0)\
        .order_by(desc(FeeSummary.pending_fee)).limit(10).all()

    top_defaulters = []
    for fs, u, sp in defaulters_q:
        top_defaulters.append({
            "student_id": u.id,
            "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "scholar_no": sp.roll_number if sp else None,
            "class_name": sp.class_name if sp else None,
            "mobile": u.phone or (sp.mobile if sp else None),
            "pending_fee": fs.pending_fee,
            "total_fee": fs.total_fee,
            "status": fs.current_status
        })

    # Highest Fee Paid Student
    top_payer_rec = db.query(FeeSummary, User, StudentProfile)\
        .join(User, FeeSummary.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
        .order_by(desc(FeeSummary.total_paid)).first()

    highest_payer = None
    if top_payer_rec:
        fs, u, sp = top_payer_rec
        highest_payer = {
            "student_id": u.id,
            "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "scholar_no": sp.roll_number if sp else None,
            "total_paid": fs.total_paid
        }

    # Collection Trend (Monthly Time Series)
    trend = []
    for i in range(5, -1, -1):
        m_dt = now - timedelta(days=i*30)
        m_start = datetime(m_dt.year, m_dt.month, 1)
        if m_dt.month == 12:
            m_end = datetime(m_dt.year + 1, 1, 1)
        else:
            m_end = datetime(m_dt.year, m_dt.month + 1, 1)
        coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= m_start, FeeReceipt.receipt_date < m_end).scalar() or 0.0
        trend.append({
            "month": m_start.strftime("%b %Y"),
            "amount": float(coll)
        })

    return {
        "today_collection": float(today_coll),
        "yesterday_collection": float(yesterday_coll),
        "monthly_collection": float(monthly_coll),
        "yearly_collection": float(yearly_coll),
        "mode_breakdown": {
            "cash": float(cash_coll),
            "online": float(online_coll),
            "cheque": float(cheque_coll),
            "neft": float(neft_coll)
        },
        "total": float(total_fee),
        "paid": float(total_paid),
        "pending": float(total_pending),
        "count_paid": count_paid,
        "count_unpaid": count_unpaid,
        "count_partial": count_partial,
        "top_defaulters": top_defaulters,
        "highest_payer": highest_payer,
        "collection_trend": trend
    }


@router.get("/receipt/{receipt_id}")
def get_official_receipt(receipt_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Phase 7: Printable & Downloadable Official College Fee Receipt Payload.
    """
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")

    # Enforce student access security (students read own receipts only)
    if current_user.role == UserRole.student and rcpt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    u = db.query(User).filter(User.id == rcpt.student_id).first()
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == rcpt.student_id).first()

    return {
        "college_info": {
            "name": "AKLANK GIRLS P.G. COLLEGE",
            "tagline": "Quality Education & Self-Reliance (Est. 1998)",
            "address": "Basant Vihar, Kota (Rajasthan) - 324009",
            "affiliation": "Affiliated to University of Kota (UOK) | Govt. of Rajasthan Recognized",
            "contact": "0744-2405620 | info@aklankcollege.ac.in"
        },
        "receipt_info": {
            "receipt_id": rcpt.receipt_id,
            "receipt_no": rcpt.receipt_no or str(rcpt.receipt_id),
            "voucher_no": rcpt.voucher_no or str(rcpt.receipt_id),
            "date": (rcpt.receipt_date or rcpt.created_at).strftime("%d-%m-%Y"),
            "session": rcpt.session or "2024-25",
            "payment_mode": rcpt.payment_mode or "CASH",
            "bank_name": rcpt.bank_name or "-",
            "transaction_id": rcpt.transaction_id or "-",
            "collected_by": rcpt.created_by or "Office Staff"
        },
        "student_info": {
            "student_id": u.id if u else rcpt.student_id,
            "student_name": sp.student_name if (sp and sp.student_name) else (u.full_name if u else "Student"),
            "father_name": sp.father_name if sp else "-",
            "scholar_no": sp.roll_number if sp else "-",
            "reg_no": sp.reg_no if sp else "-",
            "class_name": sp.class_name if sp else "-",
            "course": sp.department if sp else "General",
            "mobile": u.phone if u else (sp.mobile if sp else "-")
        },
        "fee_breakdown": {
            "paid_amount": rcpt.amount or 0.0,
            "discount_amount": rcpt.discount or 0.0,
            "fine_amount": (rcpt.fine or 0.0) + (rcpt.late_fee or 0.0),
            "net_total": (rcpt.amount or 0.0)
        },
        "remarks": rcpt.remarks or "Official Fee Receipt - Thank you!"
    }


@router.get("/reports/{report_type}")
def get_financial_reports(
    report_type: str,
    session: Optional[str] = None,
    course: Optional[str] = None,
    class_name: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 8: Production Financial Reports API Engine.
    Generates Daily Collection, Monthly Collection, Yearly Collection, Course-wise, Class-wise,
    Session-wise, Pending Fee Report, Student Ledger, and Cash Book registers.
    """
    if report_type == "daily-collection":
        today_date = date.today()
        q = db.query(FeeReceipt, User, StudentProfile).join(User, FeeReceipt.student_id == User.id).outerjoin(StudentProfile, User.id == StudentProfile.user_id)
        if start_date:
            q = q.filter(func.date(FeeReceipt.receipt_date) == start_date)
        else:
            q = q.filter(func.date(FeeReceipt.receipt_date) == today_date)
        records = q.all()
        return {"report_title": "Daily Collection Register", "date": start_date or str(today_date), "count": len(records), "records": [{
            "receipt_no": r.receipt_no, "student_name": u.full_name, "scholar_no": sp.roll_number if sp else None,
            "amount": r.amount, "mode": r.payment_mode, "date": r.receipt_date
        } for r, u, sp in records]}

    elif report_type == "course-wise":
        res = db.query(StudentProfile.department, func.sum(FeeReceipt.amount), func.count(FeeReceipt.receipt_id))\
            .join(FeeReceipt, StudentProfile.user_id == FeeReceipt.student_id)\
            .group_by(StudentProfile.department).all()
        return {"report_title": "Course-Wise Collection Summary", "data": [{
            "course": dept or "General", "total_amount": float(amt or 0.0), "receipt_count": cnt
        } for dept, amt, cnt in res]}

    elif report_type == "class-wise":
        res = db.query(StudentProfile.class_name, func.sum(FeeReceipt.amount), func.count(FeeReceipt.receipt_id))\
            .join(FeeReceipt, StudentProfile.user_id == FeeReceipt.student_id)\
            .group_by(StudentProfile.class_name).all()
        return {"report_title": "Class-Wise Collection Summary", "data": [{
            "class_name": cls or "Unassigned", "total_amount": float(amt or 0.0), "receipt_count": cnt
        } for cls, amt, cnt in res]}

    elif report_type == "pending-report":
        res = db.query(FeeSummary, User, StudentProfile)\
            .join(User, FeeSummary.student_id == User.id)\
            .outerjoin(StudentProfile, User.id == StudentProfile.user_id)\
            .filter(FeeSummary.pending_fee > 0).order_by(desc(FeeSummary.pending_fee)).all()
        return {"report_title": "Pending Fee & Defaulter Register", "count": len(res), "records": [{
            "student_id": u.id, "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "scholar_no": sp.roll_number if sp else None, "class_name": sp.class_name if sp else None,
            "mobile": u.phone or (sp.mobile if sp else None), "pending_fee": fs.pending_fee, "total_fee": fs.total_fee
        } for fs, u, sp in res]}

    elif report_type == "cash-book":
        res = db.query(FeeReceipt.payment_mode, func.sum(FeeReceipt.amount), func.count(FeeReceipt.receipt_id))\
            .group_by(FeeReceipt.payment_mode).all()
        return {"report_title": "Cash Book & Mode-Wise Financial Register", "data": [{
            "payment_mode": mode or "CASH", "total_amount": float(amt or 0.0), "count": cnt
        } for mode, amt, cnt in res]}

    else:
        raise HTTPException(status_code=400, detail="Unsupported report type")


@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Phase 11: Security & Transaction Deletion (Admin only).
    """
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")
    
    student_id = rcpt.student_id
    db.delete(rcpt)
    db.flush()

    # Recalculate Student Fee Summary
    from app.services.audit_service import verify_and_repair_fee_data
    verify_and_repair_fee_data(db)
    db.commit()

    return {"message": "Receipt deleted and student fee summary updated"}


@router.post("/{receipt_id}/reverse")
def reverse_payment(receipt_id: int, payload: dict, _=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Phase 11: Security & Payment Reversal (Admin only).
    """
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")

    rcpt.remarks = f"[REVERSED] {payload.get('reason', 'Payment Reversed by Admin')} | Prior Amt: ₹{rcpt.amount}"
    rcpt.amount = 0.0
    db.flush()

    from app.services.audit_service import verify_and_repair_fee_data
    verify_and_repair_fee_data(db)
    db.commit()

    return {"message": "Payment reversed successfully and fee summary updated"}
