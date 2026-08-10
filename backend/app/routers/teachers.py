from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile
from app.models.hr import StaffDetail, StaffStatus, EmploymentType
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user
from app.utils.password_handler import hash_password
from app.seed_aklank_staff import seed_aklank_staff_data


router = APIRouter(prefix="/api/teachers", tags=["Teachers & Faculty"])


@router.get("")
def list_teachers(
    search: Optional[str] = None,
    department: Optional[str] = None,
    subject: Optional[str] = None,
    designation: Optional[str] = None,
    employment_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    List Faculty / Staff Directory with Multi-Criteria Search & Filtering.
    Auto-seeds official Aklank College 22 records if database is unseeded.
    """
    # Auto-seed if zero staff records in database
    if db.query(TeacherProfile).count() == 0:
        try:
            seed_aklank_staff_data(db)
        except Exception:
            pass

    q = db.query(User, TeacherProfile).join(TeacherProfile, User.id == TeacherProfile.user_id)

    if search:
        s_like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                User.full_name.ilike(s_like),
                TeacherProfile.employee_id.ilike(s_like),
                TeacherProfile.department.ilike(s_like),
                TeacherProfile.subject.ilike(s_like),
                TeacherProfile.designation.ilike(s_like),
                TeacherProfile.qualification.ilike(s_like),
            )
        )

    if department:
        q = q.filter(TeacherProfile.department.ilike(f"%{department.strip()}%"))
    if subject:
        q = q.filter(TeacherProfile.subject.ilike(f"%{subject.strip()}%"))
    if designation:
        q = q.filter(TeacherProfile.designation.ilike(f"%{designation.strip()}%"))
    if employment_type:
        q = q.filter(TeacherProfile.employment_type.ilike(f"%{employment_type.strip()}%"))
    if status:
        q = q.filter(TeacherProfile.status.ilike(f"%{status.strip()}%"))

    total = q.count()
    results = q.order_by(TeacherProfile.id.asc()).offset(skip).limit(limit).all()

    teachers = []
    for u, tp in results:
        teachers.append({
            "id": u.id,
            "user_id": u.id,
            "employee_id": tp.employee_id,
            "employee_code": tp.employee_id,
            "full_name": u.full_name,
            "title": tp.title or ("Dr." if "Dr." in u.full_name else ("Ms." if "Ms." in u.full_name else "Mr.")),
            "email": u.email,
            "phone": u.phone,
            "profile_photo": u.profile_photo,
            "department": tp.department or "General",
            "department_name": tp.department or "General",
            "subject": tp.subject,
            "designation": tp.designation or "Faculty",
            "employment_type": tp.employment_type or "Teaching",
            "qualification": tp.qualification or "Not Available",
            "experience_years": tp.experience_years,
            "is_hod": bool(tp.is_hod),
            "status": tp.status or ("Active" if u.is_active else "Inactive"),
            "data_source": tp.data_source or "Official Aklank College Website",
            "last_verified_at": tp.last_verified_at.strftime("%Y-%m-%d") if tp.last_verified_at else None,
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else None,
        })

    return {"total": total, "teachers": teachers}


@router.get("/stats")
def get_staff_stats(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """
    Get dashboard metrics for Staff & Faculty Management.
    """
    total_staff = db.query(TeacherProfile).count()
    teaching_staff = db.query(TeacherProfile).filter(TeacherProfile.employment_type == "Teaching").count()
    non_teaching_staff = db.query(TeacherProfile).filter(TeacherProfile.employment_type == "Non-Teaching").count()
    admin_staff = db.query(TeacherProfile).filter(TeacherProfile.employment_type == "Administrative").count()

    total_depts = db.query(func.count(func.distinct(TeacherProfile.department))).scalar() or 0
    total_hods = db.query(TeacherProfile).filter(TeacherProfile.is_hod == True).count()

    dept_counts = (
        db.query(TeacherProfile.department, func.count(TeacherProfile.id))
        .group_by(TeacherProfile.department)
        .all()
    )

    return {
        "total_staff": total_staff,
        "teaching_staff": teaching_staff,
        "non_teaching_staff": non_teaching_staff,
        "administrative_staff": admin_staff,
        "total_departments": total_depts,
        "total_hods": total_hods,
        "department_breakdown": [{"department": d or "General", "count": c} for d, c in dept_counts]
    }


@router.get("/validation-report")
def get_validation_report(_=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Run official verification and return Aklank College Staff Database audit report.
    """
    return seed_aklank_staff_data(db)


@router.get("/my-assignments")
def get_my_teacher_assignments(current_user: User = Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Get current logged in teacher's department, courses, subjects, years, and section assignments."""
    from app.utils.teacher_access import get_teacher_access_filter
    from app.models.teacher import TeacherCourseAssignment

    access = get_teacher_access_filter(current_user, db)
    assignments = db.query(TeacherCourseAssignment).filter(
        TeacherCourseAssignment.teacher_id == current_user.id,
        TeacherCourseAssignment.status == "ACTIVE"
    ).all()

    return {
        "teacher_id": current_user.id,
        "teacher_name": current_user.full_name,
        "department": access["department"],
        "courses": access["courses"],
        "years": access["years"],
        "sections": access["sections"],
        "subjects": access["subjects"],
        "assignments": [{
            "id": a.id,
            "department": a.department,
            "course_name": a.course_name,
            "subject_name": a.subject_name,
            "year": a.year,
            "semester": a.semester,
            "section": a.section,
            "academic_session": a.academic_session
        } for a in assignments]
    }


@router.get("/{teacher_id}/assignments")
def get_teacher_assignments_by_id(teacher_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Get assignment list for a specific teacher."""
    from app.models.teacher import TeacherCourseAssignment
    assignments = db.query(TeacherCourseAssignment).filter(
        TeacherCourseAssignment.teacher_id == teacher_id,
        TeacherCourseAssignment.status == "ACTIVE"
    ).all()
    return {"teacher_id": teacher_id, "assignments": [{
        "id": a.id,
        "department": a.department,
        "course_name": a.course_name,
        "subject_name": a.subject_name,
        "year": a.year,
        "semester": a.semester,
        "section": a.section,
        "academic_session": a.academic_session
    } for a in assignments]}


@router.post("/assignments")
def create_teacher_course_assignment(data: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """Admin Endpoint: Assign Course, Department, Subject, Years, Semester, Section to a Teacher."""
    from app.models.teacher import TeacherCourseAssignment, TeacherProfile

    teacher_id = data.get("teacher_id")
    dept = data.get("department", "Computer Science")
    course_name = data.get("course_name", "BCA")
    subject_name = data.get("subject_name")
    years = data.get("years", ["1st Year", "2nd Year", "3rd Year"])
    if isinstance(years, str):
        years = [years]
    section = data.get("section", "All")
    session_year = data.get("academic_session", "2025-26")

    teacher = db.query(User).filter(User.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher user record not found")

    tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == teacher_id).first()
    if tp and not tp.department:
        tp.department = dept

    added = 0
    for yr in years:
        existing = db.query(TeacherCourseAssignment).filter(
            TeacherCourseAssignment.teacher_id == teacher_id,
            TeacherCourseAssignment.course_name == course_name,
            TeacherCourseAssignment.year == yr,
            TeacherCourseAssignment.status == "ACTIVE"
        ).first()

        if not existing:
            assign = TeacherCourseAssignment(
                teacher_id=teacher_id,
                department=dept,
                course_name=course_name,
                subject_name=subject_name,
                year=yr,
                section=section,
                academic_session=session_year,
                status="ACTIVE"
            )
            db.add(assign)
            added += 1

    db.commit()
    return {"message": f"Successfully created {added} course assignments for teacher {teacher.full_name}"}


@router.delete("/assignments/{assignment_id}")
def delete_teacher_assignment(assignment_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """Admin Endpoint: Remove a teacher course assignment."""
    from app.models.teacher import TeacherCourseAssignment
    assign = db.query(TeacherCourseAssignment).filter(TeacherCourseAssignment.id == assignment_id).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment record not found")

    db.delete(assign)
    db.commit()
    return {"message": "Teacher assignment removed successfully"}


@router.get("/profile")
def teacher_profile(current_user: User = Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Get current logged-in teacher profile."""
    tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "employee_id": tp.employee_id if tp else None,
        "department": tp.department if tp else None,
        "designation": tp.designation if tp else None,
        "subject": tp.subject if tp else None,
        "qualification": tp.qualification if tp else None,
        "experience_years": tp.experience_years if tp else None,
        "is_hod": tp.is_hod if tp else False,
    }


@router.get("/{teacher_id}")
def get_teacher_by_id(teacher_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Get complete employee profile by user ID or profile ID."""
    u = db.query(User).filter(User.id == teacher_id).first()
    tp = db.query(TeacherProfile).filter(or_(TeacherProfile.user_id == teacher_id, TeacherProfile.id == teacher_id)).first()

    if not tp and not u:
        raise HTTPException(status_code=404, detail="Employee / Teacher record not found")

    if tp and not u:
        u = db.query(User).filter(User.id == tp.user_id).first()

    return {
        "id": u.id if u else tp.user_id,
        "user_id": u.id if u else tp.user_id,
        "employee_id": tp.employee_id if tp else f"AKL-EMP-{teacher_id}",
        "full_name": u.full_name if u else "Staff Member",
        "title": tp.title if tp else "Mr.",
        "email": u.email if u else None,
        "phone": u.phone if u else None,
        "profile_photo": u.profile_photo if u else None,
        "department": tp.department if tp else "General",
        "subject": tp.subject if tp else None,
        "designation": tp.designation if tp else "Faculty",
        "employment_type": tp.employment_type if tp else "Teaching",
        "qualification": tp.qualification if tp else "Not Available",
        "experience_years": tp.experience_years if tp else None,
        "is_hod": bool(tp.is_hod) if tp else False,
        "status": tp.status if tp else ("Active" if (u and u.is_active) else "Inactive"),
        "data_source": tp.data_source if tp else "Official Aklank College Website",
        "last_verified_at": tp.last_verified_at.strftime("%Y-%m-%d %H:%M:%S") if (tp and tp.last_verified_at) else None,
        "created_at": u.created_at.strftime("%Y-%m-%d") if (u and u.created_at) else None,
    }


@router.post("", status_code=21)
def create_teacher(data: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """Add a new staff / faculty employee record."""
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip()
    dept = data.get("department", "General").strip()
    emp_type = data.get("employment_type", "Teaching")

    if not full_name:
        raise HTTPException(status_code=400, detail="Full Name is required")

    if not email:
        clean_name = "".join(c for c in full_name.lower() if c.isalnum())
        email = f"{clean_name}@aklankcollege.ac.in"

    # Avoid duplicate user
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail=f"Employee email {email} already registered")

    # Generate employee code
    prefix = "AKL-FAC" if emp_type == "Teaching" else ("AKL-ADM" if emp_type == "Administrative" else "AKL-EMP")
    count = db.query(TeacherProfile).count() + 1
    emp_code = data.get("employee_id") or f"{prefix}-{count:03d}"

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password("Teacher@123"),
        role=UserRole.admin if emp_type == "Administrative" else UserRole.teacher,
        phone=data.get("phone"),
        is_active=True
    )
    db.add(user)
    db.flush()

    tp = TeacherProfile(
        user_id=user.id,
        employee_id=emp_code,
        title=data.get("title"),
        department=dept,
        subject=data.get("subject"),
        designation=data.get("designation", "Faculty"),
        employment_type=emp_type,
        qualification=data.get("qualification"),
        experience_years=float(data["experience_years"]) if data.get("experience_years") is not None else None,
        is_hod=bool(data.get("is_hod", False)),
        data_source="Official Aklank College Website",
        last_verified_at=datetime.utcnow(),
        status="Active"
    )
    db.add(tp)

    # Sync StaffDetail
    sd = StaffDetail(
        user_id=user.id,
        employee_id=emp_code,
        title=data.get("title"),
        department=dept,
        subject=data.get("subject"),
        designation=data.get("designation", "Faculty"),
        employment_type=EmploymentType.PERMANENT if emp_type in ("Teaching", "Administrative") else EmploymentType.CONTRACT,
        status=StaffStatus.ACTIVE,
        qualification=data.get("qualification"),
        experience_years=float(data["experience_years"]) if data.get("experience_years") is not None else None,
        is_hod=bool(data.get("is_hod", False)),
        data_source="Official Aklank College Website",
        last_verified_at=datetime.utcnow()
    )
    db.add(sd)
    db.commit()

    return {"message": "Staff employee created successfully", "employee_id": emp_code, "id": user.id}


@router.put("/{teacher_id}")
def update_teacher(teacher_id: int, data: Dict[str, Any], _=Depends(require_admin), db: Session = Depends(get_db)):
    """Update employee details, change department/designation, promote to HOD, update qualification/experience."""
    u = db.query(User).filter(User.id == teacher_id).first()
    tp = db.query(TeacherProfile).filter(or_(TeacherProfile.user_id == teacher_id, TeacherProfile.id == teacher_id)).first()

    if not tp and not u:
        raise HTTPException(status_code=404, detail="Employee not found")

    if u and "full_name" in data:
        u.full_name = data["full_name"].strip()
    if u and "email" in data and data["email"]:
        u.email = data["email"].strip()
    if u and "phone" in data:
        u.phone = data["phone"]

    if tp:
        if "department" in data:
            tp.department = data["department"]
        if "subject" in data:
            tp.subject = data["subject"]
        if "designation" in data:
            tp.designation = data["designation"]
        if "qualification" in data:
            tp.qualification = data["qualification"]
        if "experience_years" in data:
            tp.experience_years = float(data["experience_years"]) if data["experience_years"] is not None else None
        if "employment_type" in data:
            tp.employment_type = data["employment_type"]
        if "is_hod" in data:
            tp.is_hod = bool(data["is_hod"])
        if "status" in data:
            tp.status = data["status"]
            if u:
                u.is_active = (data["status"] == "Active")
        tp.last_verified_at = datetime.utcnow()

    # Sync StaffDetail if exists
    sd = db.query(StaffDetail).filter(or_(StaffDetail.user_id == teacher_id, StaffDetail.employee_id == (tp.employee_id if tp else None))).first()
    if sd:
        if "department" in data:
            sd.department = data["department"]
        if "subject" in data:
            sd.subject = data["subject"]
        if "designation" in data:
            sd.designation = data["designation"]
        if "qualification" in data:
            sd.qualification = data["qualification"]
        if "experience_years" in data:
            sd.experience_years = float(data["experience_years"]) if data["experience_years"] is not None else None
        if "is_hod" in data:
            sd.is_hod = bool(data["is_hod"])
        if "status" in data:
            sd.status = StaffStatus.ACTIVE if data["status"] == "Active" else StaffStatus.INACTIVE
        sd.last_verified_at = datetime.utcnow()

    db.commit()
    return {"message": "Employee profile updated successfully"}


@router.delete("/{teacher_id}")
def deactivate_teacher(teacher_id: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    """Soft deactivate employee record (sets status = Inactive, does not hard delete)."""
    u = db.query(User).filter(User.id == teacher_id).first()
    tp = db.query(TeacherProfile).filter(or_(TeacherProfile.user_id == teacher_id, TeacherProfile.id == teacher_id)).first()

    if not u and not tp:
        raise HTTPException(status_code=404, detail="Teacher / Employee not found")

    if u:
        u.is_active = False
    if tp:
        tp.status = "Inactive"

    sd = db.query(StaffDetail).filter(or_(StaffDetail.user_id == teacher_id, StaffDetail.employee_id == (tp.employee_id if tp else None))).first()
    if sd:
        sd.status = StaffStatus.INACTIVE

    db.commit()
    return {"message": "Employee status changed to Inactive"}
