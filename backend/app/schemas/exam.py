from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ExamCreate(BaseModel):
    title: str
    subject_id: Optional[int] = None
    exam_date: datetime
    exam_type: str = "midterm"
    total_marks: float = 100.0
    passing_marks: float = 40.0
    duration_minutes: int = 180
    class_name: Optional[str] = None
    section: Optional[str] = None


class ExamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    subject_id: Optional[int]
    exam_date: datetime
    exam_type: str
    total_marks: float
    passing_marks: float
    duration_minutes: int
    class_name: Optional[str]
    created_at: datetime


class MarkCreate(BaseModel):
    student_id: int
    exam_id: int
    marks_obtained: float
    grade: Optional[str] = None
    remarks: Optional[str] = None


class MarkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    exam_id: int
    marks_obtained: float
    grade: Optional[str]
    remarks: Optional[str]
    created_at: datetime
