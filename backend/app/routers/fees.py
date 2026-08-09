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
    from sqlalchemy import cast, String

    q = (
        db.query(FeeReceipt, FeeTransaction, User, StudentProfile, UnmatchedFeeRecord)
        .outerjoin(
            FeeTransaction,
            or_(
                FeeReceipt.voucher_no == FeeTransaction.receipt_number,
                FeeReceipt.receipt_no == FeeTransaction.receipt_number,
                cast(FeeReceipt.receipt_id, String) == FeeTransaction.receipt_number
            )
        )
        .outerjoin(User, FeeReceipt.student_id == User.id)
        .outerjoin(StudentProfile, User.id == StudentProfile.user_id)
        .outerjoin(
            UnmatchedFeeRecord,
            or_(
                FeeReceipt.voucher_no == UnmatchedFeeRecord.receipt_number,
                FeeReceipt.receipt_no == UnmatchedFeeRecord.receipt_number
            )
        )
    )

    if search:
        s_like = f"%{search}%"
        q = q.filter(
            or_(
                FeeReceipt.receipt_no.ilike(s_like),
                FeeReceipt.voucher_no.ilike(s_like),
                FeeTransaction.student_name.ilike(s_like),
                FeeTransaction.scholar_no.ilike(s_like),
                FeeTransaction.reg_no.ilike(s_like),
                FeeTransaction.father_name.ilike(s_like),
                FeeTransaction.class_name.ilike(s_like),
                UnmatchedFeeRecord.student_name.ilike(s_like),
                User.full_name.ilike(s_like),
                StudentProfile.roll_number.ilike(s_like),
                StudentProfile.reg_no.ilike(s_like),
                StudentProfile.father_name.ilike(s_like),
                User.phone.ilike(s_like)
            )
        )

    if student_name:
        q = q.filter(
            or_(
                FeeTransaction.student_name.ilike(f"%{student_name}%"),
                UnmatchedFeeRecord.student_name.ilike(f"%{student_name}%"),
                User.full_name.ilike(f"%{student_name}%"),
                StudentProfile.student_name.ilike(f"%{student_name}%")
            )
        )
    if scholar_no:
        q = q.filter(
            or_(
                FeeTransaction.scholar_no.ilike(f"%{scholar_no}%"),
                FeeTransaction.reg_no.ilike(f"%{scholar_no}%"),
                StudentProfile.roll_number.ilike(f"%{scholar_no}%"),
                StudentProfile.reg_no.ilike(f"%{scholar_no}%")
            )
        )
    if voucher_no:
        q = q.filter(
            or_(
                FeeReceipt.voucher_no.ilike(f"%{voucher_no}%"),
                FeeTransaction.receipt_number.ilike(f"%{voucher_no}%")
            )
        )
    if receipt_no:
        q = q.filter(
            or_(
                FeeReceipt.receipt_no.ilike(f"%{receipt_no}%"),
                FeeTransaction.receipt_number.ilike(f"%{receipt_no}%")
            )
        )
    if father_name:
        q = q.filter(
            or_(
                FeeTransaction.father_name.ilike(f"%{father_name}%"),
                StudentProfile.father_name.ilike(f"%{father_name}%")
            )
        )
    if mobile:
        q = q.filter(
            or_(
                FeeTransaction.mobile_no.ilike(f"%{mobile}%"),
                User.phone.ilike(f"%{mobile}%"),
                StudentProfile.mobile.ilike(f"%{mobile}%")
            )
        )
    if class_name or course:
        cls_target = class_name or course
        q = q.filter(
            or_(
                FeeTransaction.class_name.ilike(f"%{cls_target}%"),
                UnmatchedFeeRecord.class_name.ilike(f"%{cls_target}%"),
                StudentProfile.class_name.ilike(f"%{cls_target}%"),
                StudentProfile.department.ilike(f"%{cls_target}%")
            )
        )
    if session:
        q = q.filter(
            or_(
                FeeReceipt.session.ilike(f"%{session}%"),
                FeeTransaction.installment.ilike(f"%{session}%")
            )
        )
    if payment_mode and payment_mode.upper() != "ALL":
        q = q.filter(
            or_(
                FeeReceipt.payment_mode.ilike(f"%{payment_mode}%"),
                FeeTransaction.payment_mode.ilike(f"%{payment_mode}%")
            )
        )

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
    for rcpt, ft, u, sp, um in results:
        # Determine actual student name with priority
        resolved_name = None
        if ft and ft.student_name and ft.student_name.strip():
            resolved_name = ft.student_name.strip()
        elif sp and sp.student_name and sp.student_name.strip():
            resolved_name = sp.student_name.strip()
        elif u and u.full_name and u.full_name != "System Administrator" and u.role == UserRole.student:
            resolved_name = u.full_name.strip()
        elif um and um.student_name and um.student_name.strip():
            resolved_name = um.student_name.strip()
        elif ft and (ft.scholar_no or ft.reg_no):
            resolved_name = f"Student #{ft.scholar_no or ft.reg_no}"
        else:
            resolved_name = f"Student #{rcpt.receipt_no or rcpt.receipt_id}"

        # Determine scholar_no & reg_no
        resolved_scholar = (ft.scholar_no if ft and ft.scholar_no else None) or (sp.roll_number if sp else None) or (um.reg_no if um else None)
        resolved_reg_no = (ft.reg_no if ft and ft.reg_no else None) or (sp.reg_no if sp else None) or (um.reg_no if um else None)
        resolved_father = (ft.father_name if ft and ft.father_name else None) or (sp.father_name if sp else None)
        resolved_class = (ft.class_name if ft and ft.class_name else None) or (sp.class_name if sp else None) or (um.class_name if um else None)
        resolved_mobile = (ft.mobile_no if ft and ft.mobile_no else None) or (u.phone if u and u.role == UserRole.student else None) or (sp.mobile if sp else None)

        fee_items.append({
            "id": rcpt.receipt_id,
            "receipt_id": rcpt.receipt_id,
            "receipt_no": rcpt.receipt_no or (ft.receipt_number if ft else str(rcpt.receipt_id)),
            "voucher_no": rcpt.voucher_no or (ft.receipt_number if ft else str(rcpt.receipt_id)),
            "student_id": (u.id if u and u.role == UserRole.student else None) or (sp.user_id if sp else rcpt.student_id),
            "student_name": resolved_name,
            "scholar_no": resolved_scholar,
            "reg_no": resolved_reg_no,
            "father_name": resolved_father,
            "class_name": resolved_class,
            "mobile": resolved_mobile,
            "amount": rcpt.amount if (rcpt.amount is not None and rcpt.amount > 0) else (ft.paid_amount if ft else 0.0),
            "payment_mode": rcpt.payment_mode or (ft.payment_mode if ft else "CASH"),
            "receipt_date": rcpt.receipt_date.strftime("%Y-%m-%d") if rcpt.receipt_date else (ft.voucher_date.strftime("%Y-%m-%d") if ft and ft.voucher_date else None),
            "session": rcpt.session or (ft.installment if ft else "2025-26"),
            "created_by": rcpt.created_by or (ft.created_by if ft else "Office"),
            "status": "PAID"
        })

    return {
        "total": total,
        "total_count": total,
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
    from sqlalchemy import cast, String

    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")

    if current_user.role == UserRole.student and rcpt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ft = db.query(FeeTransaction).filter(
        or_(
            FeeTransaction.receipt_number == rcpt.voucher_no,
            FeeTransaction.receipt_number == rcpt.receipt_no,
            cast(FeeTransaction.id, String) == str(rcpt.receipt_id)
        )
    ).first()

    um = db.query(UnmatchedFeeRecord).filter(
        or_(
            UnmatchedFeeRecord.receipt_number == rcpt.voucher_no,
            UnmatchedFeeRecord.receipt_number == rcpt.receipt_no
        )
    ).first()

    u = db.query(User).filter(User.id == rcpt.student_id).first()
    sp = db.query(StudentProfile).filter(StudentProfile.user_id == rcpt.student_id).first()
    if not sp and ft and (ft.scholar_no or ft.reg_no):
        sp = db.query(StudentProfile).filter(
            or_(StudentProfile.roll_number == ft.scholar_no, StudentProfile.reg_no == ft.reg_no)
        ).first()

    resolved_name = (
        (ft.student_name.strip() if ft and ft.student_name and ft.student_name.strip() else None)
        or (sp.student_name.strip() if sp and sp.student_name and sp.student_name.strip() else None)
        or (u.full_name.strip() if u and u.role == UserRole.student and u.full_name != "System Administrator" else None)
        or (um.student_name.strip() if um and um.student_name and um.student_name.strip() else None)
        or f"Student #{rcpt.receipt_no or rcpt.receipt_id}"
    )

    resolved_father = (ft.father_name if ft and ft.father_name else None) or (sp.father_name if sp else "-")
    resolved_scholar = (ft.scholar_no if ft and ft.scholar_no else None) or (sp.roll_number if sp else "-")
    resolved_reg = (ft.reg_no if ft and ft.reg_no else None) or (sp.reg_no if sp else "-")
    resolved_class = (ft.class_name if ft and ft.class_name else None) or (sp.class_name if sp else (sp.department if sp else "-"))
    resolved_mobile = (ft.mobile_no if ft and ft.mobile_no else None) or (u.phone if u and u.role == UserRole.student else (sp.mobile if sp else "-"))

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
            "receipt_no": rcpt.receipt_no or (ft.receipt_number if ft else str(rcpt.receipt_id)),
            "voucher_no": rcpt.voucher_no or (ft.receipt_number if ft else str(rcpt.receipt_id)),
            "date": (rcpt.receipt_date or rcpt.created_at).strftime("%d-%m-%Y") if (rcpt.receipt_date or rcpt.created_at) else "-",
            "session": rcpt.session or (ft.installment if ft else "2025-26"),
            "payment_mode": rcpt.payment_mode or (ft.payment_mode if ft else "CASH"),
            "bank_name": rcpt.bank_name or (ft.bank_name if ft else "-"),
            "transaction_id": rcpt.transaction_id or (ft.transaction_id if ft else "-"),
            "collected_by": rcpt.created_by or (ft.created_by if ft else "Office Staff")
        },
        "student_info": {
            "student_id": (u.id if u and u.role == UserRole.student else None) or rcpt.student_id,
            "student_name": resolved_name,
            "father_name": resolved_father,
            "scholar_no": resolved_scholar,
            "reg_no": resolved_reg,
            "class_name": resolved_class,
            "course": resolved_class,
            "mobile": resolved_mobile
        },
        "fee_breakdown": {
            "paid_amount": rcpt.amount if (rcpt.amount is not None and rcpt.amount > 0) else (ft.paid_amount if ft else 0.0),
            "discount_amount": rcpt.discount or (ft.discount_amount if ft else 0.0),
            "fine_amount": (rcpt.fine or 0.0) + (rcpt.late_fee or 0.0),
            "net_total": rcpt.amount if (rcpt.amount is not None and rcpt.amount > 0) else (ft.paid_amount if ft else 0.0)
        },
        "remarks": rcpt.remarks or (ft.remarks if ft else "Official Fee Receipt - Thank you!")
    }


@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    rcpt = db.query(FeeReceipt).filter(FeeReceipt.receipt_id == receipt_id).first()
    if not rcpt:
        raise HTTPException(status_code=404, detail="Fee receipt not found")
    
    db.delete(rcpt)
    db.commit()
    return {"message": "Receipt deleted successfully"}


def build_student_fee_history(student_id: int, db: Session) -> Dict[str, Any]:
    """
    Build complete year-wise fee history, installment timeline, and summary for a student.
    Distinguishes First Year, Second Year, Third Year, and all historical sessions.
    """
    user = db.query(User).filter(User.id == student_id).first()
    if not user:
        # Check if student_id passed is StudentProfile.id
        sp = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if sp:
            user = db.query(User).filter(User.id == sp.user_id).first()
            student_id = sp.user_id

    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    sp = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    fsum = db.query(FeeSummary).filter(FeeSummary.student_id == user.id).first()
    
    # Query Academic Histories (Sessions)
    academic_histories = db.query(StudentAcademicHistory).filter(
        StudentAcademicHistory.student_id == user.id
    ).order_by(StudentAcademicHistory.session.asc()).all()

    # Query all Fee Receipts for this student
    receipts = db.query(FeeReceipt).filter(
        FeeReceipt.student_id == user.id
    ).order_by(FeeReceipt.receipt_date.asc(), FeeReceipt.receipt_id.asc()).all()

    # Query all Fee Transactions as well
    txs = db.query(FeeTransaction).filter(
        or_(
            FeeTransaction.student_id == user.id,
            FeeTransaction.reg_no == (sp.roll_number if sp else None),
            FeeTransaction.reg_no == (sp.reg_no if sp else None),
            FeeTransaction.scholar_no == (sp.roll_number if sp else None)
        )
    ).order_by(FeeTransaction.voucher_date.asc(), FeeTransaction.id.asc()).all()

    # Determine unique academic sessions
    sessions_seen = []
    session_class_map = {}
    for ah in academic_histories:
        if ah.session and ah.session not in sessions_seen:
            sessions_seen.append(ah.session)
            session_class_map[ah.session] = ah.class_name or (sp.class_name if sp else "General")

    for r in receipts:
        if r.session and r.session not in sessions_seen:
            sessions_seen.append(r.session)
            session_class_map[r.session] = sp.class_name if sp else "General"

    for t in txs:
        sess = t.installment or (t.voucher_date.strftime("%Y-%m") if t.voucher_date else "2023-24")
        if sess and sess not in sessions_seen:
            sessions_seen.append(sess)
            if sess not in session_class_map:
                session_class_map[sess] = t.class_name or (sp.class_name if sp else "General")

    if not sessions_seen:
        sessions_seen = ["2023-24"]
        session_class_map["2023-24"] = sp.class_name if sp else "General"

    sessions_seen = sorted(sessions_seen)

    def get_year_title(session_str: str, class_str: Optional[str], index: int) -> str:
        c_up = (class_str or "").upper()
        if "PART-I" in c_up or "I-SEM" in c_up or "PART 1" in c_up:
            return f"First Year ({session_str})"
        elif "PART-II" in c_up or "II-SEM" in c_up or "PART 2" in c_up:
            return f"Second Year ({session_str})"
        elif "PART-III" in c_up or "III-SEM" in c_up or "PART 3" in c_up:
            return f"Third Year ({session_str})"
        elif "FINAL" in c_up:
            return f"Final Year ({session_str})"
        elif "PRE" in c_up:
            return f"Previous Year ({session_str})"
        else:
            ordinals = ["First Year", "Second Year", "Third Year", "Fourth Year"]
            ord_name = ordinals[index] if index < len(ordinals) else f"Year {index + 1}"
            return f"{ord_name} ({session_str})"

    def get_standard_fee(c_name: Optional[str]) -> float:
        if not c_name:
            return 15000.0
        c_upper = c_name.upper()
        if "NC B.A" in c_upper:
            return 2000.0
        elif "B.C.A" in c_upper or "BCA" in c_upper:
            if "PART-III" in c_upper:
                return 21000.0
            elif "PART-II" in c_upper:
                return 24000.0
            return 25000.0
        elif "B.SC" in c_upper:
            return 15000.0
        elif "M.A" in c_upper:
            return 12000.0
        elif "B.A" in c_upper:
            return 12000.0
        return 15000.0

    # Group receipts and transactions by session
    receipts_by_session: Dict[str, List[FeeReceipt]] = {s: [] for s in sessions_seen}
    tx_by_session: Dict[str, List[FeeTransaction]] = {s: [] for s in sessions_seen}

    for r in receipts:
        target_s = r.session if (r.session and r.session in receipts_by_session) else sessions_seen[0]
        receipts_by_session[target_s].append(r)

    seen_vouchers = {r.voucher_no for r in receipts if r.voucher_no}

    for t in txs:
        if t.receipt_number not in seen_vouchers:
            target_s = t.installment if (t.installment and t.installment in tx_by_session) else sessions_seen[0]
            tx_by_session[target_s].append(t)

    academic_years = []
    overall_total_fee = 0.0
    overall_total_paid = 0.0
    overall_total_disc = 0.0

    for idx, s in enumerate(sessions_seen):
        c_name = session_class_map.get(s) or (sp.class_name if sp else "General")
        year_title = get_year_title(s, c_name, idx)
        std_fee = get_standard_fee(c_name)

        s_receipts = receipts_by_session.get(s, [])
        s_txs = tx_by_session.get(s, [])

        s_paid = sum(r.amount for r in s_receipts) + sum(t.paid_amount for t in s_txs)
        s_disc = sum(r.discount for r in s_receipts) + sum(t.discount_amount for t in s_txs)

        # Dynamic session fee
        s_total_fee = max(std_fee, s_paid + s_disc)
        s_pending = max(0.0, s_total_fee - s_paid - s_disc)
        s_progress = round((s_paid / s_total_fee * 100.0), 1) if s_total_fee > 0 else 100.0

        if s_pending <= 0:
            s_status = "PAID"
        elif s_paid > 0:
            s_status = "PARTIAL"
        else:
            s_status = "UNPAID"

        # Build installments timeline
        installments = []
        inst_counter = 1

        for r in s_receipts:
            installments.append({
                "installment_number": inst_counter,
                "receipt_id": r.receipt_id,
                "voucher_no": r.voucher_no or r.receipt_no or str(r.receipt_id),
                "receipt_no": r.receipt_no or r.voucher_no or str(r.receipt_id),
                "amount": r.amount,
                "discount": r.discount,
                "payment_date": r.receipt_date.strftime("%Y-%m-%d") if r.receipt_date else (r.created_at.strftime("%Y-%m-%d") if r.created_at else "-"),
                "date_formatted": r.receipt_date.strftime("%d %b %Y") if r.receipt_date else "-",
                "payment_mode": r.payment_mode or "CASH",
                "bank_name": r.bank_name or "AKLANK COLLEGE",
                "transaction_id": r.transaction_id or r.voucher_no or "-",
                "remarks": r.remarks or f"Installment #{inst_counter} - {c_name}",
                "status": "PAID"
            })
            inst_counter += 1

        for t in s_txs:
            installments.append({
                "installment_number": inst_counter,
                "receipt_id": t.id + 500000,
                "voucher_no": t.receipt_number or str(t.id),
                "receipt_no": t.receipt_number or str(t.id),
                "amount": t.paid_amount,
                "discount": t.discount_amount,
                "payment_date": t.voucher_date.strftime("%Y-%m-%d") if t.voucher_date else (t.created_at.strftime("%Y-%m-%d") if t.created_at else "-"),
                "date_formatted": t.voucher_date.strftime("%d %b %Y") if t.voucher_date else "-",
                "payment_mode": t.payment_mode or "CASH",
                "bank_name": t.bank_name or "AKLANK COLLEGE",
                "transaction_id": t.cheque_number or t.manual_ref_no or t.receipt_number or "-",
                "remarks": t.remarks or f"Installment #{inst_counter} - {c_name}",
                "status": "PAID"
            })
            inst_counter += 1

        overall_total_fee += s_total_fee
        overall_total_paid += s_paid
        overall_total_disc += s_disc

        academic_years.append({
            "session": s,
            "year_title": year_title,
            "class_name": c_name,
            "total_fee": s_total_fee,
            "paid_amount": s_paid,
            "discount_amount": s_disc,
            "pending_amount": s_pending,
            "progress_percentage": min(100.0, s_progress),
            "status": s_status,
            "installments_count": len(installments),
            "installments": installments
        })

    overall_pending = max(0.0, overall_total_fee - overall_total_paid - overall_total_disc)
    overall_progress = round((overall_total_paid / overall_total_fee * 100.0), 1) if overall_total_fee > 0 else 100.0

    if overall_pending <= 0:
        overall_status = "PAID"
    elif overall_total_paid > 0:
        overall_status = "PARTIAL"
    else:
        overall_status = "UNPAID"

    return {
        "student": {
            "id": user.id,
            "profile_id": sp.id if sp else user.id,
            "name": user.full_name or (sp.student_name if sp else "Student"),
            "username": user.username,
            "email": user.email,
            "phone": user.phone or (sp.mobile if sp else "-"),
            "scholar_no": sp.roll_number if sp else "-",
            "reg_no": sp.reg_no if sp else "-",
            "roll_number": sp.roll_number if sp else "-",
            "class_name": sp.class_name if sp else "-",
            "course": sp.department if sp else "-",
            "department": sp.department if sp else "-",
            "section": sp.section if sp else "-",
            "father_name": sp.father_name if sp else "-",
            "mother_name": sp.mother_name if sp else "-",
            "category": sp.category if sp else "General",
            "gender": sp.gender if sp else "-",
            "status": sp.status if sp else "ACTIVE"
        },
        "overall_summary": {
            "total_fee": overall_total_fee,
            "total_paid": overall_total_paid,
            "total_discount": overall_total_disc,
            "total_pending": overall_pending,
            "payment_progress": min(100.0, overall_progress),
            "status": overall_status,
            "total_academic_years": len(academic_years),
            "last_payment_date": fsum.last_payment_date.strftime("%d-%m-%Y") if (fsum and fsum.last_payment_date) else None
        },
        "academic_years": academic_years
    }


@router.get("/student/{student_id}/history")
def get_student_fee_history(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get full multi-year fee and installment history for a specific student.
    Accessible by Admin, Teachers, and the student themself.
    """
    if current_user.role == UserRole.student and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return build_student_fee_history(student_id, db)


@router.get("/my/history")
def get_my_fee_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full multi-year fee and installment history for currently logged in student."""
    return build_student_fee_history(current_user.id, db)

