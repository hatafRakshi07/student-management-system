from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile
from app.models.parent import ParentProfile
from app.models.audit import AuditLog
from app.schemas.user import (
    StudentRegister, TeacherRegister, AdminRegister,
    UserLogin, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest,
)
from app.utils.password_handler import hash_password, verify_password
from app.utils.jwt_handler import (
    create_access_token, create_refresh_token,
    verify_token, verify_refresh_token, revoke_token,
)
from app.utils.helpers import generate_reset_token
from app.config import settings
from app.utils.auth_deps import get_current_user, require_admin
from app.utils.rate_limit import limiter

security = HTTPBearer()
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.get("/ping")
def ping():
    """Lightweight keepalive — wakes Render free-tier from sleep."""
    return {"status": "ok"}


def _to_iso(dt):
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, 'isoformat') else str(dt)

def _user_out(user: User, db: Session, sp=None, tp=None, pp=None) -> dict:
    role_val = user.role.value if hasattr(user.role, 'value') else str(user.role)
    data = {
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "role": role_val, "phone": getattr(user, 'phone', None),
        "profile_photo": getattr(user, 'profile_photo', None), "is_active": getattr(user, 'is_active', True),
        "created_at": _to_iso(getattr(user, 'created_at', None)),
        "last_login": _to_iso(getattr(user, 'last_login', None)),
    }
    if (user.role == UserRole.student or role_val == "student"):
        try:
            if sp is None:
                sp = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
            if sp:
                data.update({
                    "roll_number": getattr(sp, 'roll_number', None),
                    "department": getattr(sp, 'department', None),
                    "class_name": getattr(sp, 'class_name', None),
                    "section": getattr(sp, 'section', None),
                    "semester": getattr(sp, 'semester', None),
                    "year": getattr(sp, 'year', None),
                    "student_name": getattr(sp, 'student_name', user.full_name),
                    "scholar_no": getattr(sp, 'reg_no', None) or getattr(sp, 'admission_no', None),
                })
        except Exception:
            db.rollback()
    if (user.role == UserRole.teacher or role_val == "teacher"):
        try:
            if tp is None:
                tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
            if tp:
                data.update({
                    "employee_id": getattr(tp, 'employee_id', None),
                    "department": getattr(tp, 'department', None),
                })
        except Exception:
            db.rollback()
    if (user.role == UserRole.parent or role_val == "parent"):
        try:
            if pp is None:
                pp = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
            if pp:
                data.update({
                    "father_name": getattr(pp, 'father_name', None),
                    "mother_name": getattr(pp, 'mother_name', None),
                    "guardian_name": getattr(pp, 'guardian_name', None),
                    "mobile": getattr(pp, 'mobile', None),
                    "address": getattr(pp, 'address', None),
                })
        except Exception:
            db.rollback()
    return data


@router.post("/login")
@limiter.limit("20/minute")
def login(request: Request, creds: UserLogin, db: Session = Depends(get_db)):
    raw_login = (creds.email or "").strip()
    raw_password = (creds.password or "").strip()

    if not raw_login or not raw_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Please provide your Student/User Name, Roll/Scholar No, Email, and Password")

    user = None
    sp = None
    tp = None
    pp = None

    # Fast path: exact email match (uses index, covers most users)
    try:
        user = db.query(User).filter(User.email == raw_login.lower()).first()
    except Exception:
        db.rollback()

    # Broader User-table lookup: username, phone, full_name (exact)
    if not user:
        try:
            user = db.query(User).filter(
                (User.username.ilike(raw_login)) |
                (User.phone == raw_login) |
                (User.full_name.ilike(raw_login))
            ).first()
        except Exception:
            db.rollback()

    # StudentProfile lookup: roll_no, reg_no, admission_no, mobile, exact student_name
    if not user:
        try:
            sp = db.query(StudentProfile).filter(
                (StudentProfile.roll_number.ilike(raw_login)) |
                (StudentProfile.reg_no.ilike(raw_login)) |
                (StudentProfile.admission_no.ilike(raw_login)) |
                (StudentProfile.student_name.ilike(raw_login)) |
                (StudentProfile.mobile == raw_login) |
                (StudentProfile.father_mobile == raw_login)
            ).first()
            if sp and sp.user_id:
                user = db.query(User).filter(User.id == sp.user_id).first()
        except Exception:
            db.rollback()

    # TeacherProfile lookup: employee_id
    if not user:
        try:
            tp = db.query(TeacherProfile).filter(TeacherProfile.employee_id.ilike(raw_login)).first()
            if tp and tp.user_id:
                user = db.query(User).filter(User.id == tp.user_id).first()
        except Exception:
            db.rollback()

    # ParentProfile lookup: mobile, alt_mobile, email, father_name, mother_name
    if not user:
        try:
            pp = db.query(ParentProfile).filter(
                (ParentProfile.mobile == raw_login) |
                (ParentProfile.alt_mobile == raw_login) |
                (ParentProfile.email.ilike(raw_login)) |
                (ParentProfile.father_name.ilike(raw_login)) |
                (ParentProfile.mother_name.ilike(raw_login))
            ).first()
            if pp and pp.user_id:
                user = db.query(User).filter(User.id == pp.user_id).first()
        except Exception:
            db.rollback()

    # Last-resort partial / substring match (slowest — only if nothing else matched)
    if not user:
        try:
            user = db.query(User).filter(User.full_name.ilike(f"%{raw_login}%")).first()
        except Exception:
            db.rollback()
    if not user:
        try:
            sp = db.query(StudentProfile).filter(StudentProfile.student_name.ilike(f"%{raw_login}%")).first()
            if sp and sp.user_id:
                user = db.query(User).filter(User.id == sp.user_id).first()
        except Exception:
            db.rollback()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="No user or account found matching that Name, Roll No, Phone, or Email")

    # Load profiles once if not already fetched above
    if sp is None:
        try:
            sp = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        except Exception:
            db.rollback()
    if tp is None:
        try:
            tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == user.id).first()
        except Exception:
            db.rollback()
    if pp is None:
        try:
            pp = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        except Exception:
            db.rollback()

    # Password validation (bcrypt hash, phone number shortcut, or demo fallback)
    pwd_valid = False
    if user.hashed_password:
        try:
            pwd_valid = verify_password(raw_password, user.hashed_password)
        except Exception:
            pwd_valid = False

    # Compute role string early — needed for role-specific demo auth and token creation
    user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)

    if not pwd_valid and getattr(settings, 'enable_demo_auth', True):
        if user.phone and raw_password == user.phone.strip():
            pwd_valid = True
        elif sp and sp.mobile and raw_password == sp.mobile.strip():
            pwd_valid = True
        elif sp and sp.father_mobile and raw_password == sp.father_mobile.strip():
            pwd_valid = True
        elif sp and sp.mother_mobile and raw_password == sp.mother_mobile.strip():
            pwd_valid = True
        elif pp and pp.mobile and raw_password == pp.mobile.strip():
            pwd_valid = True
        elif pp and pp.alt_mobile and raw_password == pp.alt_mobile.strip():
            pwd_valid = True
        elif raw_password.lower() in {
            f"{user_role}@123", f"{user_role}123", user_role,
            "123456", "password",
        }:
            import logging
            logging.warning(f"DEMO AUTH used for user {user.id} ({user.email}) with role {user_role}")
            pwd_valid = True

    if not pwd_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid password or phone number. Please try again.")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated. Contact administration.")

    try:
        user.last_login = datetime.utcnow()
        ip = request.client.host if (request and request.client) else "127.0.0.1"
        db.add(AuditLog(user_id=user.id, action="login", ip_address=ip))
        db.commit()
    except Exception:
        db.rollback()

    token = create_access_token({"sub": str(user.id), "role": user_role})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user_role})
    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _user_out(user, db, sp=sp, tp=tp, pp=pp)
    }


@router.post("/refresh")
def refresh_token(request_data: dict, db: Session = Depends(get_db)):
    token_str = request_data.get("refresh_token")
    if not token_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="refresh_token required")
    payload = verify_refresh_token(token_str)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")
    user_role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    new_access_token = create_access_token({"sub": str(user.id), "role": user_role})
    new_refresh_token = create_refresh_token({"sub": str(user.id), "role": user_role})
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }



@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = verify_token(credentials.credentials)
    jti = payload.get("jti")
    exp = payload.get("exp")
    if jti:
        import time
        revoke_token(jti, float(exp) if exp else time.time() + 86400)
    db.add(AuditLog(user_id=current_user.id, action="logout"))
    db.commit()
    return {"message": "Logged out successfully"}


@router.post("/register/student", status_code=201)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(StudentProfile).filter(StudentProfile.roll_number == data.roll_number).first():
        raise HTTPException(status_code=400, detail="Roll number already exists")
    user = User(email=data.email, full_name=data.full_name,
                hashed_password=hash_password(data.password),
                role=UserRole.student, phone=data.phone)
    db.add(user)
    db.flush()
    profile = StudentProfile(
        user_id=user.id, roll_number=data.roll_number,
        department=data.department, class_name=data.class_name,
        section=data.section, semester=data.semester, year=data.year,
        parent_email=data.parent_email, address=data.address,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return {"message": "Student registered successfully", "user_id": user.id}


@router.post("/register/teacher", status_code=201)
def register_teacher(
    data: TeacherRegister,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(TeacherProfile).filter(TeacherProfile.employee_id == data.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    user = User(email=data.email, full_name=data.full_name,
                hashed_password=hash_password(data.password),
                role=UserRole.teacher, phone=data.phone)
    db.add(user)
    db.flush()
    profile = TeacherProfile(
        user_id=user.id, employee_id=data.employee_id,
        department=data.department, qualification=data.qualification,
        experience_years=data.experience_years,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return {"message": "Teacher registered successfully", "user_id": user.id}


@router.post("/register/admin", status_code=201)
def register_admin(
    data: AdminRegister,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=data.email, full_name=data.full_name,
                hashed_password=hash_password(data.password),
                role=UserRole.admin, phone=data.phone)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Admin registered successfully", "user_id": user.id}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_out(current_user, db)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = generate_reset_token()
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    if not user or (user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/change-password")
def change_password(data: ChangePasswordRequest,
                    current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
