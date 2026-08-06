from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class StudentRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None
    roll_number: str
    department: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[int] = None
    year: Optional[int] = None
    parent_email: Optional[EmailStr] = None
    address: Optional[str] = None


class TeacherRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None
    employee_id: str
    department: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None


class AdminRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone: Optional[str]
    profile_photo: Optional[str]
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
