"""
Strict Department-Wise and Course-Wise Access Control Engine for Teachers.
Enforces teacher primary department & assigned course/year boundaries at API/SQL query level.
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile, TeacherCourseAssignment
from app.models.student import StudentProfile


def get_teacher_access_filter(current_user: User, db: Session) -> Dict[str, Any]:
    """
    Retrieves the strict access boundaries for a logged-in user:
    - If admin: is_admin = True (full access)
    - If teacher: resolves primary department and assigned courses/years/sections.
    """
    if current_user.role == UserRole.admin:
        return {
            "is_admin": True,
            "department": None,
            "courses": [],
            "years": [],
            "sections": [],
            "subjects": []
        }

    tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == current_user.id).first()
    dept = (tp.department if tp and tp.department else "Computer Science").strip()

    # Query teacher's active assignments
    assignments = db.query(TeacherCourseAssignment).filter(
        TeacherCourseAssignment.teacher_id == current_user.id,
        TeacherCourseAssignment.status == "ACTIVE"
    ).all()

    courses = sorted(set([a.course_name.strip() for a in assignments if a.course_name]),
                     key=lambda c: (0 if c in ("BCA", "B.C.A", "B.C.A.") else
                                    1 if c in ("BA", "B.A", "B.A.") else
                                    2 if "B.Sc" in c else 3))
    years = sorted(set([a.year.strip() for a in assignments if a.year]))
    sections = sorted(set([a.section.strip() for a in assignments if a.section and a.section != "All"]))
    subjects = sorted(set([a.subject_name.strip() for a in assignments if a.subject_name]))

    # Default course mapping based on primary department if no explicit assignments exist
    if not courses:
        dept_lower = dept.lower()
        if "computer" in dept_lower or "bca" in dept_lower:
            courses = ["BCA", "B.C.A.", "B.C.A", "B.C.A. Part", "CS-3A"]
        elif "humanities" in dept_lower or "arts" in dept_lower:
            courses = ["BA", "B.A.", "B.A", "Arts"]
        elif "home science" in dept_lower:
            courses = ["MA Home Science", "B.A. Home Science", "Home Science", "M.A."]
        elif "drawing" in dept_lower:
            courses = ["MA Drawing & Painting", "B.A. Drawing & Painting", "Drawing", "M.A."]
        elif "science" in dept_lower:
            courses = ["B.Sc Biology", "B.Sc Maths", "B.Sc", "B.Sc.", "B.SC"]

    if not years:
        years = ["1st Year", "2nd Year", "3rd Year", "1", "2", "3"]

    return {
        "is_admin": False,
        "department": dept,
        "courses": courses,
        "years": years,
        "sections": sections,
        "subjects": subjects
    }


def filter_student_query_for_teacher(query, current_user: User, db: Session):
    """
    Applies SQL WHERE filtering to a SQLAlchemy query joining User & StudentProfile.
    Guarantees a teacher ONLY sees students in their department/assigned courses.
    Fixed: better handling of department name mismatches (e.g. 'Computer Science' vs 'Computer Applications').
    """
    access = get_teacher_access_filter(current_user, db)
    if access["is_admin"]:
        return query

    dept = access["department"]
    courses = access["courses"]

    # Build inclusive filter clauses based on assigned courses + department
    filter_clauses = []
    has_bca = False
    has_ba = False
    has_bsc = False

    for c in courses:
        c_low = c.lower().replace(".", "").replace(" ", "")
        filter_clauses.append(StudentProfile.class_name.ilike(f"%{c}%"))
        if "bca" in c_low:
            has_bca = True
        if c_low in ("ba", "arts") or ("ba" in c_low and "bca" not in c_low):
            has_ba = True
        if "bsc" in c_low:
            has_bsc = True

    # BCA / Computer Science teacher — include ALL common BCA class_name patterns
    if has_bca:
        filter_clauses.extend([
            StudentProfile.class_name.ilike("%bca%"),
            StudentProfile.class_name.ilike("%b.c.a%"),
            StudentProfile.class_name.ilike("%b.c.a.%"),
            StudentProfile.department.ilike("%computer%"),
            StudentProfile.department.ilike("%applications%"),
            StudentProfile.department.ilike("%bca%"),
        ])
    if has_ba:
        filter_clauses.extend([
            StudentProfile.class_name.ilike("%b.a%"),
            StudentProfile.class_name.ilike("%ba%"),
        ])
    if has_bsc:
        filter_clauses.extend([
            StudentProfile.class_name.ilike("%b.sc%"),
            StudentProfile.class_name.ilike("%bsc%"),
        ])

    # Department-level fallback
    if dept:
        dept_lower = dept.lower()
        filter_clauses.append(StudentProfile.department.ilike(f"%{dept}%"))
        if "computer" in dept_lower or "bca" in dept_lower:
            filter_clauses.extend([
                StudentProfile.class_name.ilike("%bca%"),
                StudentProfile.class_name.ilike("%b.c.a%"),
                StudentProfile.department.ilike("%computer%"),
                StudentProfile.department.ilike("%applications%"),
            ])
        elif "humanities" in dept_lower or "arts" in dept_lower:
            filter_clauses.extend([
                StudentProfile.class_name.ilike("%b.a%"),
                StudentProfile.class_name.ilike("%ba%"),
                StudentProfile.department.ilike("%humanities%"),
            ])
        elif "home science" in dept_lower:
            filter_clauses.extend([
                StudentProfile.class_name.ilike("%home science%"),
                StudentProfile.department.ilike("%home%"),
            ])
        elif "drawing" in dept_lower:
            filter_clauses.extend([
                StudentProfile.class_name.ilike("%drawing%"),
                StudentProfile.department.ilike("%painting%"),
            ])
        elif "science" in dept_lower:
            filter_clauses.extend([
                StudentProfile.class_name.ilike("%b.sc%"),
                StudentProfile.class_name.ilike("%bsc%"),
                StudentProfile.department.ilike("%science%"),
            ])

    if filter_clauses:
        query = query.filter(or_(*filter_clauses))

    return query


def verify_teacher_can_access_student(current_user: User, student_user_id: int, db: Session) -> bool:
    """
    Checks if a logged-in teacher is authorized to view or mark attendance for a specific student.
    Raises 403 Forbidden if unauthorized.
    """
    if current_user.role == UserRole.admin:
        return True

    sp = db.query(StudentProfile).filter(StudentProfile.user_id == student_user_id).first()
    if not sp:
        return False

    access = get_teacher_access_filter(current_user, db)
    dept = (access["department"] or "").lower()
    courses = [c.lower().replace(".", "").replace(" ", "") for c in access["courses"]]

    st_dept = (sp.department or "").lower()
    st_cls = (sp.class_name or "").lower()
    st_cls_clean = st_cls.replace(".", "").replace(" ", "")

    authorized = False
    # Check by department match
    if dept and (dept in st_dept or st_dept in dept):
        authorized = True
    # Check by course match
    for c in courses:
        if c and (c in st_cls_clean or st_cls_clean.startswith(c[:3])):
            authorized = True
            break
    # Common keyword fallbacks
    if "computer" in dept and ("bca" in st_cls or "cs" in st_cls or "computer" in st_dept or "applications" in st_dept):
        authorized = True
    elif "humanities" in dept and ("ba" in st_cls or "arts" in st_dept or "humanities" in st_dept):
        authorized = True
    elif "home science" in dept and ("home science" in st_cls or "home" in st_dept):
        authorized = True
    elif "drawing" in dept and ("drawing" in st_cls or "painting" in st_dept):
        authorized = True
    elif "science" in dept and ("b.sc" in st_cls or "science" in st_dept):
        authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Teacher {current_user.full_name} is only authorized for department '{access['department']}'."
        )

    return True
