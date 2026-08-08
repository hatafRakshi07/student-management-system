from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

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
    q = db.query(FeeReceipt, User, StudentProfile)\
        .join(User, FeeReceipt.student_id == User.id)\
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)

    if search:
        s_like = f"%{search}%"
        q = q.filter(
            or_(
                FeeReceipt.receipt_no.ilike(s_like),
                FeeReceipt.voucher_no.ilike(s_like),
                User.full_name.ilike(s_like),
                StudentProfile.roll_number.ilike(s_like),
                StudentProfile.reg_no.ilike(s_like),
                StudentProfile.father_name.ilike(s_like),
                User.phone.ilike(s_like)
            )
        )

    if student_name:
        q = q.filter(User.full_name.ilike(f"%{student_name}%"))
    if scholar_no:
        q = q.filter(StudentProfile.roll_number.ilike(f"%{scholar_no}%"))
    if voucher_no:
        q = q.filter(FeeReceipt.voucher_no.ilike(f"%{voucher_no}%"))
    if receipt_no:
        q = q.filter(FeeReceipt.receipt_no.ilike(f"%{receipt_no}%"))
    if father_name:
        q = q.filter(StudentProfile.father_name.ilike(f"%{father_name}%"))
    if mobile:
        q = q.filter(User.phone.ilike(f"%{mobile}%"))
    if class_name or course:
        cls_target = class_name or course
        q = q.filter(StudentProfile.class_name.ilike(f"%{cls_target}%"))
    if session:
        q = q.filter(FeeReceipt.session.ilike(f"%{session}%"))
    if payment_mode and payment_mode.upper() != "ALL":
        q = q.filter(FeeReceipt.payment_mode.ilike(f"%{payment_mode}%"))

    if start_date:
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            q = q.filter(func.date(FeeReceipt.receipt_date) >= d_start)
        except Exception:
            pass
    if end_date:
        try:
            d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            q = q.filter(func.date(FeeReceipt.receipt_date) <= d_end)
        except Exception:
            pass

    total = q.count()
    results = q.order_by(desc(FeeReceipt.receipt_id)).offset(skip).limit(limit).all()

    fee_items = []
    for rcpt, u, sp in results:
        fee_items.append({
            "id": rcpt.receipt_id,
            "receipt_id": rcpt.receipt_id,
            "receipt_no": rcpt.receipt_no or str(rcpt.receipt_id),
            "voucher_no": rcpt.voucher_no or str(rcpt.receipt_id),
            "student_id": u.id,
            "student_name": u.full_name or (sp.student_name if sp else f"Student #{u.id}"),
            "scholar_no": sp.roll_number if sp else None,
            "reg_no": sp.reg_no if sp else None,
            "father_name": sp.father_name if sp else None,
            "class_name": sp.class_name if sp else None,
            "mobile": u.phone if u else None,
            "amount": rcpt.amount,
            "payment_mode": rcpt.payment_mode or "CASH",
            "receipt_date": rcpt.receipt_date.strftime("%Y-%m-%d") if rcpt.receipt_date else None,
            "session": rcpt.session or "2024-25",
            "created_by": rcpt.created_by or "Office",
            "status": "PAID"
        })

    return {
        "total": total,
        "fees": fee_items
    }


@router.post("/collect", status_code=201)
@router.post("", status_code=201)
def collect_fee_payment(
    payload: Dict[str, Any],
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 5: Collect Fee Payment & Issue Receipt Voucher.
    """
    student_id = payload.get("student_id")
    amount = float(payload.get("amount", 0.0))
    payment_mode = payload.get("payment_mode", "CASH")
    remarks = payload.get("remarks", "Fee Deposit")

    if not student_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid student_id or payment amount")

    receipt_count = db.query(FeeReceipt).count() + 1001
    receipt_no = f"REC-2024-{receipt_count}"
    voucher_no = f"VCH-{receipt_count}"

    rcpt = FeeReceipt(
        student_id=student_id,
        receipt_no=receipt_no,
        voucher_no=voucher_no,
        amount=amount,
        payment_mode=payment_mode,
        receipt_date=date.today(),
        session="2024-25",
        remarks=remarks,
        created_by=current_user.full_name
    )
    db.add(rcpt)
    db.flush()

    # Recalculate Student Fee Summary
    fs = db.query(FeeSummary).filter(FeeSummary.student_id == student_id).first()
    if fs:
        fs.total_paid = (fs.total_paid or 0.0) + amount
        fs.pending_fee = max(0.0, (fs.total_fee or 0.0) - fs.total_paid)
        fs.current_status = "PAID" if fs.pending_fee <= 0 else "PARTIAL"

    db.commit()

    return {
        "id": rcpt.receipt_id,
        "receipt_id": rcpt.receipt_id,
        "receipt_no": rcpt.receipt_no,
        "voucher_no": rcpt.voucher_no,
        "amount": rcpt.amount,
        "payment_mode": rcpt.payment_mode,
        "message": "Fee collected successfully"
    }


@router.get("/stats")
def get_fee_stats(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    total_fee = db.query(func.sum(FeeSummary.total_fee)).scalar() or 0.0
    total_paid = db.query(func.sum(FeeSummary.total_paid)).scalar() or 0.0
    total_pending = db.query(func.sum(FeeSummary.pending_fee)).scalar() or 0.0

    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    yesterday_start = today_start - timedelta(days=1)

    today_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= today_start.date()).scalar() or 0.0
    yesterday_coll = db.query(func.sum(FeeReceipt.amount)).filter(
        FeeReceipt.receipt_date >= yesterday_start.date(),
        FeeReceipt.receipt_date < today_start.date()
    ).scalar() or 0.0

    month_start = datetime(now.year, now.month, 1).date()
    monthly_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= month_start).scalar() or 0.0

    year_start = datetime(now.year, 1, 1).date()
    yearly_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.receipt_date >= year_start).scalar() or 0.0

    cash_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%CASH%")).scalar() or 0.0
    online_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%ONLINE%")).scalar() or 0.0
    cheque_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%CHEQUE%")).scalar() or 0.0
    neft_coll = db.query(func.sum(FeeReceipt.amount)).filter(FeeReceipt.payment_mode.ilike("%NEFT%")).scalar() or 0.0

    count_paid = db.query(FeeSummary).filter(FeeSummary.pending_fee <= 0).count()
    count_unpaid = db.query(FeeSummary).filter(FeeSummary.total_paid == 0).count()
    count_partial = db.query(FeeSummary).filter(FeeSummary.pending_fee > 0, FeeSummary.total_paid > 0).count()

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
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")

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


@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")
    
    db.delete(rcpt)
    db.commit()
    return {"message": "Receipt deleted successfully"}
