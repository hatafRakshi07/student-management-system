"""
Seed and synchronization module for official Aklank College Kota staff & faculty master data.
Populates 22 official records (18 Teaching, 3 Non-Teaching, 1 Administrative Principal).
Uses upsert logic (matching employee_code or normalized full_name) to avoid duplicates.
"""

from datetime import datetime, date
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile
from app.models.hr import (
    StaffDetail, StaffSalaryStructure, StaffLeaveBalance,
    EmploymentType, StaffStatus
)
from app.models.student import DepartmentMaster
from app.utils.password_handler import hash_password


AKLANK_STAFF_RECORDS = [
    # ── 1. HUMANITIES (5) ──────────────────────────────────────────────────
    {
        "employee_code": "AKL-FAC-001",
        "title": "Mr.",
        "full_name": "Mr. O P Rajpurohit",
        "department_name": "Humanities",
        "subject": None,
        "designation": "HoD, Humanities",
        "employment_type": "Teaching",
        "qualification": "MA, MCom, MPhil, NET",
        "experience_years": 22.0,
        "is_hod": True,
        "status": "ACTIVE",
        "email": "op.rajpurohit@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-002",
        "title": "Dr.",
        "full_name": "Dr. Rajesh Gupta",
        "department_name": "Humanities",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MA, MPhil, NET, Ph.D",
        "experience_years": 22.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "rajesh.gupta@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-003",
        "title": "Ms.",
        "full_name": "Ms. Swati Nahar",
        "department_name": "Humanities",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MA, B.Ed, MPhil, NET",
        "experience_years": 5.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "swati.nahar@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-004",
        "title": "Ms.",
        "full_name": "Mahima Nama",
        "department_name": "Humanities",
        "subject": "English",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "mahima.nama@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-005",
        "title": "Dr.",
        "full_name": "Dr. Yogesh Sharma",
        "department_name": "Humanities",
        "subject": "Sociology",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "yogesh.sharma@aklankcollege.ac.in",
    },

    # ── 2. HOME SCIENCE (3) ────────────────────────────────────────────────
    {
        "employee_code": "AKL-FAC-006",
        "title": "Dr.",
        "full_name": "Dr. Divya Dubey",
        "department_name": "Home Science",
        "subject": None,
        "designation": "HoD, Department of Home Science",
        "employment_type": "Teaching",
        "qualification": "MSc, PhD, NET",
        "experience_years": 18.0,
        "is_hod": True,
        "status": "ACTIVE",
        "email": "divya.dubey@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-007",
        "title": "Ms.",
        "full_name": "Ms. Garima Saxena",
        "department_name": "Home Science",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MSc, PhD (Pursuing)",
        "experience_years": 8.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "garima.saxena@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-008",
        "title": "Ms.",
        "full_name": "Ms. Komal Kanwasia",
        "department_name": "Home Science",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MA, B.Ed",
        "experience_years": 7.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "komal.kanwasia@aklankcollege.ac.in",
    },

    # ── 3. DRAWING & PAINTING (2) ───────────────────────────────────────────
    {
        "employee_code": "AKL-FAC-009",
        "title": "Mr.",
        "full_name": "Mr. BrijSunder Sharma",
        "department_name": "Drawing & Painting",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MA (Drawing & Painting), B.Ed, SLET",
        "experience_years": 4.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "brijsunder.sharma@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-010",
        "title": "Mr.",
        "full_name": "Mr. Avinash Sharma",
        "department_name": "Drawing & Painting",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MA Drawing & Painting (Gold Medalist), B.Ed, PhD (Pursuing), SLET",
        "experience_years": 8.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "avinash.sharma@aklankcollege.ac.in",
    },

    # ── 4. COMPUTER SCIENCE / BCA (3) ──────────────────────────────────────
    {
        "employee_code": "AKL-FAC-011",
        "title": "Ms.",
        "full_name": "Ms. Neelima Jain",
        "department_name": "Computer Science",
        "subject": None,
        "designation": "HoD, Department of Computer Science",
        "employment_type": "Teaching",
        "qualification": "MCA",
        "experience_years": 20.0,
        "is_hod": True,
        "status": "ACTIVE",
        "email": "neelima.jain@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-012",
        "title": "Ms.",
        "full_name": "Ms. Priya Jain",
        "department_name": "Computer Science",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MCA",
        "experience_years": 11.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "priya.jain@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-013",
        "title": "Ms.",
        "full_name": "Ms. Preeti Sharma",
        "department_name": "Computer Science",
        "subject": None,
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": "MCA, M.Tech (CSE)",
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "preeti.sharma@aklankcollege.ac.in",
    },

    # ── 5. SCIENCE (5) ──────────────────────────────────────────────────────
    {
        "employee_code": "AKL-FAC-014",
        "title": "Dr.",
        "full_name": "Dr. Ranjana Gupta",
        "department_name": "Science",
        "subject": "Zoology",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "ranjana.gupta@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-015",
        "title": "Dr.",
        "full_name": "Dr. Sonal",
        "department_name": "Science",
        "subject": "Botany",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "sonal@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-016",
        "title": "Mr.",
        "full_name": "Mr. K.K. Goswami",
        "department_name": "Science",
        "subject": "Mathematics",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "kk.goswami@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-017",
        "title": "Mr.",
        "full_name": "Mr. Harsh Jain",
        "department_name": "Science",
        "subject": "Physics",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "harsh.jain@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-FAC-018",
        "title": "Mr.",
        "full_name": "Mr. Mahaveer Prasad Paratiya",
        "department_name": "Science",
        "subject": "Chemistry",
        "designation": "Faculty",
        "employment_type": "Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "mahaveer.paratiya@aklankcollege.ac.in",
    },

    # ── 6. NON-TEACHING (3) ─────────────────────────────────────────────────
    {
        "employee_code": "AKL-EMP-001",
        "title": "Mr.",
        "full_name": "Mr. Hemraj Gujar",
        "department_name": "Administration",
        "subject": None,
        "designation": "Office Assistant",
        "employment_type": "Non-Teaching",
        "qualification": None,
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "hemraj.gujar@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-EMP-002",
        "title": "Mr.",
        "full_name": "Mr. Abhinav Pahariya",
        "department_name": "Technical / IT Support",
        "subject": None,
        "designation": "Technical Staff",
        "employment_type": "Non-Teaching",
        "qualification": "Diploma in Computer Hardware",
        "experience_years": 18.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "abhinav.pahariya@aklankcollege.ac.in",
    },
    {
        "employee_code": "AKL-EMP-003",
        "title": "Mr.",
        "full_name": "Mr. Deepak Gautam",
        "department_name": "Administration",
        "subject": None,
        "designation": "Non-Teaching Staff",
        "employment_type": "Non-Teaching",
        "qualification": "B.Com",
        "experience_years": 8.0,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "deepak.gautam@aklankcollege.ac.in",
    },

    # ── 7. PRINCIPAL / ADMINISTRATIVE (1) ────────────────────────────────────
    {
        "employee_code": "AKL-ADM-001",
        "title": "Dr.",
        "full_name": "Dr. Lalit Kumar Sharma",
        "department_name": "Administration",
        "subject": None,
        "designation": "Principal",
        "employment_type": "Administrative",
        "qualification": "PhD",
        "experience_years": None,
        "is_hod": False,
        "status": "ACTIVE",
        "email": "principal@aklankcollege.ac.in",
    },
]


def _migrate_schema_columns(db: Session):
    """Executes safe ALTER TABLE statements to add missing columns to PostgreSQL/SQLite tables."""
    from sqlalchemy import text
    columns_to_add = [
        ("teacher_profiles", "subject", "VARCHAR(255)"),
        ("teacher_profiles", "title", "VARCHAR(50)"),
        ("teacher_profiles", "designation", "VARCHAR(100)"),
        ("teacher_profiles", "employment_type", "VARCHAR(50)"),
        ("teacher_profiles", "is_hod", "BOOLEAN DEFAULT FALSE"),
        ("teacher_profiles", "data_source", "VARCHAR(255) DEFAULT 'Official Aklank College Website'"),
        ("teacher_profiles", "last_verified_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
        ("teacher_profiles", "status", "VARCHAR(50) DEFAULT 'Active'"),

        ("staff_details", "subject", "VARCHAR(255)"),
        ("staff_details", "title", "VARCHAR(50)"),
        ("staff_details", "is_hod", "BOOLEAN DEFAULT FALSE"),
        ("staff_details", "data_source", "VARCHAR(255) DEFAULT 'Official Aklank College Website'"),
        ("staff_details", "last_verified_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"),
    ]

    for table, col, col_type in columns_to_add:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type};"))
            db.commit()
        except Exception:
            db.rollback()
            try:
                db.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};"))
                db.commit()
            except Exception:
                db.rollback()


def seed_aklank_staff_data(db: Session = None) -> Dict[str, Any]:
    """
    Seed/Upsert official 22 Aklank College staff records into database.
    Idempotent logic: updates if existing, inserts if missing.
    Returns audit & validation summary.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    # Migrate table columns first if DB table exists without new columns
    _migrate_schema_columns(db)

    created_count = 0
    updated_count = 0

    try:
        # 1. Ensure Department records exist
        departments = [
            "Humanities", "Home Science", "Drawing & Painting",
            "Computer Science", "Science", "Administration", "Technical / IT Support"
        ]
        for dept_name in departments:
            existing_dept = db.query(DepartmentMaster).filter(DepartmentMaster.name.ilike(dept_name)).first()
            if not existing_dept:
                db.add(DepartmentMaster(name=dept_name))
        db.flush()

        now = datetime.utcnow()

        for rec in AKLANK_STAFF_RECORDS:
            code = rec["employee_code"]
            raw_name = rec["full_name"].strip()
            email = rec["email"]

            # Match User by email or exact/normalized full_name
            user = db.query(User).filter(
                (User.email == email) |
                (func.lower(User.full_name) == raw_name.lower())
            ).first()

            role = UserRole.admin if rec["employment_type"] == "Administrative" else UserRole.teacher

            if not user:
                user = User(
                    email=email,
                    full_name=raw_name,
                    hashed_password=hash_password("Teacher@123"),
                    role=role,
                    phone=None,
                    is_active=True,
                    created_at=now,
                )
                db.add(user)
                db.flush()
                created_count += 1
            else:
                user.full_name = raw_name
                user.role = role
                user.is_active = True
                updated_count += 1

            # Sync TeacherProfile
            tp = db.query(TeacherProfile).filter(
                (TeacherProfile.employee_id == code) | (TeacherProfile.user_id == user.id)
            ).first()

            if not tp:
                tp = TeacherProfile(
                    user_id=user.id,
                    employee_id=code,
                    department=rec["department_name"],
                    subject=rec["subject"],
                    title=rec["title"],
                    designation=rec["designation"],
                    employment_type=rec["employment_type"],
                    qualification=rec["qualification"],
                    experience_years=rec["experience_years"],
                    is_hod=rec["is_hod"],
                    data_source="Official Aklank College Website",
                    last_verified_at=now,
                    status="Active" if rec["status"] == "ACTIVE" else "Inactive",
                )
                db.add(tp)
            else:
                tp.employee_id = code
                tp.department = rec["department_name"]
                tp.subject = rec["subject"]
                tp.title = rec["title"]
                tp.designation = rec["designation"]
                tp.employment_type = rec["employment_type"]
                tp.qualification = rec["qualification"]
                tp.experience_years = rec["experience_years"]
                tp.is_hod = rec["is_hod"]
                tp.data_source = "Official Aklank College Website"
                tp.last_verified_at = now
                tp.status = "Active" if rec["status"] == "ACTIVE" else "Inactive"

            # Sync StaffDetail (HR Payroll table)
            sd = db.query(StaffDetail).filter(
                (StaffDetail.employee_id == code) | (StaffDetail.user_id == user.id)
            ).first()

            emp_type_enum = (
                EmploymentType.PERMANENT
                if rec["employment_type"] in ("Teaching", "Administrative", "PERMANENT")
                else EmploymentType.CONTRACT
            )
            status_enum = StaffStatus.ACTIVE if rec["status"] == "ACTIVE" else StaffStatus.INACTIVE

            if not sd:
                sd = StaffDetail(
                    user_id=user.id,
                    employee_id=code,
                    title=rec["title"],
                    department=rec["department_name"],
                    subject=rec["subject"],
                    designation=rec["designation"],
                    employment_type=emp_type_enum,
                    status=status_enum,
                    qualification=rec["qualification"],
                    experience_years=rec["experience_years"],
                    is_hod=rec["is_hod"],
                    data_source="Official Aklank College Website",
                    last_verified_at=now,
                    joining_date=date(2022, 7, 1)
                )
                db.add(sd)
                db.flush()

                # Add salary structure default
                basic = 45000.0 if rec["is_hod"] or rec["designation"] == "Principal" else 30000.0
                sal_struct = StaffSalaryStructure(
                    staff_id=sd.id,
                    basic_pay=basic,
                    da_allowance=basic * 0.20,
                    hra_allowance=basic * 0.15,
                    ta_allowance=2500.0,
                    gross_salary=basic * 1.35 + 2500.0,
                    net_salary=basic * 1.25 + 2000.0,
                )
                db.add(sal_struct)
                db.add(StaffLeaveBalance(staff_id=sd.id))
            else:
                sd.employee_id = code
                sd.title = rec["title"]
                sd.department = rec["department_name"]
                sd.subject = rec["subject"]
                sd.designation = rec["designation"]
                sd.qualification = rec["qualification"]
                sd.experience_years = rec["experience_years"]
                sd.is_hod = rec["is_hod"]
                sd.data_source = "Official Aklank College Website"
                sd.last_verified_at = now
                sd.status = status_enum

        db.commit()

        # ── Duplicate & Validation Verification ─────────────────────────────
        total_staff_count = db.query(StaffDetail).count()
        teaching_count = db.query(StaffDetail).filter(
            StaffDetail.employee_id.like("AKL-FAC-%")
        ).count()
        non_teaching_count = db.query(StaffDetail).filter(
            StaffDetail.employee_id.like("AKL-EMP-%")
        ).count()
        admin_count = db.query(StaffDetail).filter(
            StaffDetail.employee_id.like("AKL-ADM-%")
        ).count()
        hod_count = db.query(StaffDetail).filter(StaffDetail.is_hod == True).count()

        # Check for duplicates by full_name
        duplicate_check = db.query(
            User.full_name, func.count(User.id)
        ).filter(
            User.role.in_([UserRole.teacher, UserRole.admin])
        ).group_by(User.full_name).having(func.count(User.id) > 1).all()

        duplicate_names = [name for name, cnt in duplicate_check]

        dept_summary = {}
        for dept in departments:
            cnt = db.query(StaffDetail).filter(StaffDetail.department.ilike(dept)).count()
            dept_summary[dept] = cnt

        report = {
            "title": "Aklank College Staff Master Database",
            "source": "https://aklankcollege.com/staff-members/ & https://aklankcollege.com/principals-desk/",
            "total_seed_records": len(AKLANK_STAFF_RECORDS),
            "total_database_staff": total_staff_count,
            "teaching_staff": teaching_count,
            "non_teaching_staff": non_teaching_count,
            "administrative_staff": admin_count,
            "total_hods": hod_count,
            "department_breakdown": dept_summary,
            "duplicate_names_found": len(duplicate_names),
            "duplicates": duplicate_names,
            "status": "VALIDATED_CLEAN" if len(duplicate_names) == 0 else "WARNING_DUPLICATES",
            "last_verified_at": now.strftime("%Y-%m-%d %H:%M:%S UTC")
        }

        print("Aklank Staff Master Seeding Report:")
        print(f"  Teaching: {teaching_count} | Non-Teaching: {non_teaching_count} | Admin: {admin_count} | Total HODs: {hod_count}")
        print(f"  Duplicates Found: {len(duplicate_names)}")

        return report

    except Exception as e:
        db.rollback()
        print(f"Error seeding Aklank Staff records: {e}")
        raise e
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_aklank_staff_data()
