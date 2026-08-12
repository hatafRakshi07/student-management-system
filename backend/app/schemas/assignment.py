from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    subject_id: Optional[int] = None
    max_marks: float = 100.0


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    max_marks: Optional[float] = None


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    deadline: datetime
    subject_id: Optional[int]
    teacher_id: int
    file_path: Optional[str]
    max_marks: float
    is_active: bool
    created_at: datetime


class SubmissionCreate(BaseModel):
    text_content: Optional[str] = None


class GradeSubmission(BaseModel):
    marks_obtained: float
    grade: Optional[str] = None
    feedback: Optional[str] = None


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    student_id: int
    file_path: Optional[str]
    text_content: Optional[str]
    submitted_at: datetime
    grade: Optional[str]
    feedback: Optional[str]
    marks_obtained: Optional[float]
    status: str
