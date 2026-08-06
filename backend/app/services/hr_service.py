import json
import uuid
from datetime import datetime, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import func, or_, and_, desc
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile
from app.models.hr import (
    StaffDetail, StaffBankDetail, StaffSalaryStructure, SalaryTransaction,
    StaffLeaveBalance, StaffAuditLog, EmploymentType, StaffStatus, PayrollStatus
)


def calculate_salary_totals(
    basic: float,
    da: float = 0.0,
    hra: float = 0.0,
    ta: float = 0.0,
    medical: float = 0.0,
    bonus: float = 0.0,
    special: float = 0.0,
    pf: float = 0.0,
    esic: float = 0.0,
    prof_tax: float = 0.0,
    income_tax: float = 0.0,
    loan_ded: float = 0.0,
    other_ded: float = 0.0
) -> Tuple[float, float, float]:
    """Calculate Gross Salary, Total Deductions, and Net Disbursed Salary."""
    gross = round(basic + da + hra + ta + medical + bonus + special, 2)
    deductions = round(pf + esic + prof_tax + income_tax + loan_ded + other_ded, 2)
    net = round(max(0.0, gross - deductions), 2)
    return gross, deductions, net


def generate_monthly_payroll_disbursement(db: Session, month: str = "August", year: int = 2026) -> Dict[str, Any]:
    """
    Automated One-Click Bulk Monthly Payroll Engine.
    Disburses salary to all active staff members and generates unique payslip tokens.
    """
    active_staff = db.query(StaffDetail).filter(StaffDetail.status == StaffStatus.ACTIVE).all()
    
    # Auto-seed StaffDetail for teachers without staff detail
    all_teachers = db.query(User).filter(User.role.in_([UserRole.teacher, UserRole.admin])).all()
    for t in all_teachers:
        sd = db.query(StaffDetail).filter(StaffDetail.user_id == t.id).first()
        if not sd:
            new_sd = StaffDetail(
                user_id=t.id,
                employee_id=f"EMP-{t.id:04d}",
                department="Arts & Humanities",
                designation="Assistant Professor" if t.role == UserRole.teacher else "Principal",
                employment_type=EmploymentType.PERMANENT,
                status=StaffStatus.ACTIVE,
                joining_date=date(2023, 7, 1)
            )
            db.add(new_sd)
            db.flush()
            
            # Add default salary structure
            gross, ded, net = calculate_salary_totals(25000.0, 5000.0, 4000.0, 2000.0, 1000.0, 0.0, 1000.0, 1800.0, 500.0, 200.0, 1000.0, 0.0, 0.0)
            sal_struct = StaffSalaryStructure(
                staff_id=new_sd.id,
                basic_pay=25000.0, da_allowance=5000.0, hra_allowance=4000.0, ta_allowance=2000.0,
                medical_allowance=1000.0, special_allowance=1000.0, pf_deduction=1800.0, esic_deduction=500.0,
                prof_tax=200.0, income_tax=1000.0, gross_salary=gross, net_salary=net
            )
            db.add(sal_struct)
            db.add(StaffLeaveBalance(staff_id=new_sd.id))

    db.commit()

    active_staff = db.query(StaffDetail).filter(StaffDetail.status == StaffStatus.ACTIVE).all()
    disbursed_count = 0
    already_disbursed = 0
    total_net_disbursed = 0.0

    for sd in active_staff:
        struct = db.query(StaffSalaryStructure).filter(StaffSalaryStructure.staff_id == sd.id).first()
        if not struct:
            gross, ded, net = calculate_salary_totals(25000.0, 5000.0, 4000.0, 2000.0, 1000.0, 0.0, 1000.0, 1800.0, 500.0, 200.0, 1000.0, 0.0, 0.0)
            struct = StaffSalaryStructure(staff_id=sd.id, basic_pay=25000.0, gross_salary=gross, net_salary=net)
            db.add(struct)
            db.flush()

        existing = db.query(SalaryTransaction).filter(
            SalaryTransaction.staff_id == sd.id,
            SalaryTransaction.month == month,
            SalaryTransaction.year == year
        ).first()

        if existing:
            already_disbursed += 1
            total_net_disbursed += existing.net_salary
        else:
            gross = struct.gross_salary
            net = struct.net_salary
            deductions = round(gross - net, 2)
            token = f"AKL-PAY-{sd.employee_id}-{month[:3].upper()}{year}-{uuid.uuid4().hex[:6].upper()}"

            txn = SalaryTransaction(
                staff_id=sd.id,
                user_id=sd.user_id,
                month=month,
                year=year,
                payment_date=date.today(),
                gross_salary=gross,
                total_deductions=deductions,
                net_salary=net,
                payment_mode="BANK_TRANSFER",
                status=PayrollStatus.PAID,
                payslip_token=token,
                created_at=datetime.utcnow()
            )
            db.add(txn)
            disbursed_count += 1
            total_net_disbursed += net

    db.commit()

    return {
        "month": month,
        "year": year,
        "newly_disbursed": disbursed_count,
        "already_disbursed": already_disbursed,
        "total_disbursed_amount": round(total_net_disbursed, 2)
    }


def log_hr_audit(db: Session, staff_id: int, action: str, modified_by_id: Optional[int], old_vals: Optional[str] = None, new_vals: Optional[str] = None):
    """Log audit trail for HR edits."""
    audit = StaffAuditLog(
        staff_id=staff_id,
        action=action,
        modified_by_id=modified_by_id,
        old_values=old_vals,
        new_values=new_vals,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
