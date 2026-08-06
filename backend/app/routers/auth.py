from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile
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
from app.utils.auth_deps import get_current_user, require_admin
from app.utils.rate_limit import limiter

security = HTTPBearer()
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _user_out(user: User, db: Session) -> dict:
    data = {
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "role": user.role.value, "phone": user.phone,
        "profile_photo": user.profile_photo, "is_active": user.is_active,
        "created_at": user.created_at, "last_login": user.last_login,
    }
    if user.role == UserRole.student and user.student_profile:
        sp = user.student_profile
        data.update({"roll_number": sp.roll_number, "department": sp.department,
                     "class_name": sp.class_name, "section": sp.section,
                     "semester": sp.semester, "year": sp.year})
    if user.role == UserRole.teacher and user.teacher_profile:
        tp = user.teacher_profile
        data.update({"employee_id": tp.employee_id, "department": tp.department})
    return data


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, creds: UserLogin, db: Session = Depends(get_db)):
    login_id = (creds.email or "").strip()
    
    # Match by username, email, or phone
    user = db.query(User).filter(
        (User.username == login_id) |
        (User.email == login_id) |
        (User.phone == login_id)
    ).first()

    if not user:
        # Match by Scholar No / Roll Number / Reg No / Admission No in StudentProfile
        sp = db.query(StudentProfile).filter(
            (StudentProfile.roll_number == login_id) |
            (StudentProfile.reg_no == login_id) |
            (StudentProfile.admission_no == login_id)
        ).first()
        if sp:
            user = db.query(User).filter(User.id == sp.user_id).first()

    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid username, email, or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    user.last_login = datetime.utcnow()
    db.add(AuditLog(user_id=user.id, action="login",
                    ip_address=request.client.host if request.client else None))
    db.commit()
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": _user_out(user, db)
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
    new_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    new_refresh_token = create_refresh_token({"sub": str(user.id), "role": user.role.value})
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
