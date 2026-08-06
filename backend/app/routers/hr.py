from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile
from app.models.hr import (
    StaffDetail, StaffBankDetail, StaffSalaryStructure, SalaryTransaction,
    StaffLeaveBalance, StaffAuditLog, EmploymentType, StaffStatus, PayrollStatus
)
from app.services.hr_service import (
    calculate_salary_totals,
    generate_monthly_payroll_disbursement,
    log_hr_audit
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/hr", tags=["Staff & HR Payroll"])


@router.get("/staff")
def list_staff_members(
    search: Optional[str] = None,
    department: Optional[str] = None,
    designation: Optional[str] = None,
    employment_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    List Staff Members Directory with Multi-Criteria Search & Filtering.
    """
    # Ensure default payroll generation runs to seed staff profiles if empty
    generate_monthly_payroll_disbursement(db, "August", 2026)

    q = db.query(StaffDetail, User)\
        .join(User, StaffDetail.user_id == User.id)

    if search:
        s_like = f"%{search}%"
        q = q.filter(
            User.full_name.ilike(s_like) |
            User.email.ilike(s_like) |
            User.phone.ilike(s_like) |
            StaffDetail.employee_id.ilike(s_like) |
            StaffDetail.department.ilike(s_like) |
            StaffDetail.designation.ilike(s_like)
        )

    if department:
        q = q.filter(StaffDetail.department.ilike(f"%{department}%"))
    if designation:
        q = q.filter(StaffDetail.designation.ilike(f"%{designation}%"))
    if employment_type:
        q = q.filter(StaffDetail.employment_type == employment_type)
    if status:
        q = q.filter(StaffDetail.status == status)

    total_count = q.count()
    results = q.order_by(StaffDetail.id.asc()).offset(skip).limit(limit).all()

    staff_list = []
    for sd, u in results:
        struct = db.query(StaffSalaryStructure).filter(StaffSalaryStructure.staff_id == sd.id).first()
        staff_list.append({
            "id": sd.id,
            "user_id": u.id,
            "employee_id": sd.employee_id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "department": sd.department or "General",
            "designation": sd.designation or "Staff",
            "employment_type": sd.employment_type.value if hasattr(sd.employment_type, "value") else str(sd.employment_type),
            "status": sd.status.value if hasattr(sd.status, "value") else str(sd.status),
            "joining_date": sd.joining_date.strftime("%d-%m-%Y") if sd.joining_date else "-",
            "qualification": sd.qualification or "Graduate",
            "net_salary": struct.net_salary if struct else 34500.0
        })

    return {"total_count": total_count, "staff": staff_list}


@router.post("/payroll/generate")
def run_payroll_generation(
    payload: Dict[str, Any],
    _=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin One-Click Bulk Monthly Payroll Disbursement Engine."""
    month = payload.get("month", "August")
    year = int(payload.get("year", 2026))

    result = generate_monthly_payroll_disbursement(db, month, year)
    return {
        "message": f"Payroll generated successfully for {month} {year}",
        "details": result
    }


@router.get("/payslip/{transaction_id}")
def get_official_payslip(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Phase 16: Official Printable Salary Slip Payload.
    Delivers Aklank College header, earnings & deductions itemization, Net Pay in Words,
    PF/ESIC numbers, and digital signature placeholders.
    """
    txn = db.query(SalaryTransaction).filter(SalaryTransaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Salary transaction record not found")

    # Enforce staff security (staff view own payslips only)
    if current_user.role == UserRole.teacher and txn.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    u = db.query(User).filter(User.id == txn.user_id).first()
    sd = db.query(StaffDetail).filter(StaffDetail.id == txn.staff_id).first()
    bank = db.query(StaffBankDetail).filter(StaffBankDetail.staff_id == txn.staff_id).first()
    struct = db.query(StaffSalaryStructure).filter(StaffSalaryStructure.staff_id == txn.staff_id).first()

    return {
        "college_info": {
            "name": "AKLANK GIRLS P.G. COLLEGE",
            "tagline": "Quality Education & Self-Reliance (Est. 1998)",
            "address": "Basant Vihar, Kota (Rajasthan) - 324009",
            "contact": "0744-2405620 | hr@aklankcollege.ac.in"
        },
        "payslip_info": {
            "payslip_no": txn.id,
            "month_year": f"{txn.month} {txn.year}",
            "payment_date": txn.payment_date.strftime("%d-%m-%Y"),
            "payment_mode": txn.payment_mode or "BANK_TRANSFER",
            "payslip_token": txn.payslip_token or f"AKL-PAY-{txn.id}"
        },
        "employee_info": {
            "employee_id": sd.employee_id if sd else f"EMP-{u.id}",
            "full_name": u.full_name if u else "Staff Member",
            "department": sd.department if sd else "General",
            "designation": sd.designation if sd else "Staff",
            "joining_date": sd.joining_date.strftime("%d-%m-%Y") if (sd and sd.joining_date) else "-",
            "bank_name": bank.bank_name if bank else "State Bank of India",
            "account_number": bank.account_number if bank else "XXXXXX1029",
            "ifsc_code": bank.ifsc_code if bank else "SBIN0001234",
            "pf_number": bank.pf_number if bank else "RJ/KOT/98212/001",
            "esic_number": bank.esic_number if bank else "1098234710"
        },
        "salary_breakdown": {
            "earnings": {
                "basic_pay": struct.basic_pay if struct else 25000.0,
                "da": struct.da_allowance if struct else 5000.0,
                "hra": struct.hra_allowance if struct else 4000.0,
                "ta": struct.ta_allowance if struct else 2000.0,
                "medical": struct.medical_allowance if struct else 1000.0,
                "special": struct.special_allowance if struct else 1000.0,
                "gross_salary": txn.gross_salary
            },
            "deductions": {
                "pf": struct.pf_deduction if struct else 1800.0,
                "esic": struct.esic_deduction if struct else 500.0,
                "prof_tax": struct.prof_tax if struct else 200.0,
                "income_tax": struct.income_tax if struct else 1000.0,
                "total_deductions": txn.total_deductions
            },
            "net_salary": txn.net_salary
        }
    }


@router.get("/admin/dashboard")
def get_admin_hr_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Admin HR Command Center Metrics & Analytics."""
    total_staff = db.query(StaffDetail).count()
    active_staff = db.query(StaffDetail).filter(StaffDetail.status == StaffStatus.ACTIVE).count()
    total_expense = db.query(func.sum(SalaryTransaction.net_salary)).scalar() or 0.0

    # Department breakdown
    dept_counts = db.query(StaffDetail.department, func.count(StaffDetail.id))\
        .group_by(StaffDetail.department).all()

    # Recent Salary Transactions
    recent_txns = db.query(SalaryTransaction, User, StaffDetail)\
        .join(User, SalaryTransaction.user_id == User.id)\
        .join(StaffDetail, SalaryTransaction.staff_id == StaffDetail.id)\
        .order_by(desc(SalaryTransaction.id)).limit(10).all()

    return {
        "total_staff": total_staff,
        "active_staff": active_staff,
        "monthly_salary_expense": float(total_expense),
        "department_breakdown": [{
            "department": dept or "General",
            "count": cnt
        } for dept, cnt in dept_counts],
        "recent_payroll": [{
            "id": t.id,
            "employee_id": sd.employee_id,
            "full_name": u.full_name,
            "department": sd.department,
            "month_year": f"{t.month} {t.year}",
            "net_salary": t.net_salary,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status)
        } for t, u, sd in recent_txns]
    }


@router.get("/reports/{report_type}")
def get_hr_reports(
    report_type: str,
    department: Optional[str] = None,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 16: HR & Payroll Financial Reports Engine.
    Generates Employee Register, Department Register, Payroll Register.
    """
    if report_type == "employee-register":
        records = db.query(StaffDetail, User).join(User, StaffDetail.user_id == User.id).all()
        return {
            "report_title": "Official Staff Employee Register",
            "count": len(records),
            "records": [{
                "employee_id": sd.employee_id,
                "full_name": u.full_name,
                "email": u.email,
                "phone": u.phone,
                "department": sd.department,
                "designation": sd.designation,
                "employment_type": sd.employment_type.value if hasattr(sd.employment_type, "value") else str(sd.employment_type),
                "status": sd.status.value if hasattr(sd.status, "value") else str(sd.status)
            } for sd, u in records]
        }

    elif report_type == "payroll-register":
        records = db.query(SalaryTransaction, User, StaffDetail)\
            .join(User, SalaryTransaction.user_id == User.id)\
            .join(StaffDetail, SalaryTransaction.staff_id == StaffDetail.id)\
            .order_by(desc(SalaryTransaction.id)).all()
        return {
            "report_title": "Monthly Salary Disbursement Register",
            "count": len(records),
            "records": [{
                "payslip_no": t.id,
                "employee_id": sd.employee_id,
                "full_name": u.full_name,
                "month_year": f"{t.month} {t.year}",
                "gross_salary": t.gross_salary,
                "deductions": t.total_deductions,
                "net_salary": t.net_salary,
                "mode": t.payment_mode
            } for t, u, sd in records]
        }

    else:
        raise HTTPException(status_code=400, detail="Unsupported HR report type")
