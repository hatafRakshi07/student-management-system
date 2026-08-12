from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime


class AttendanceCreate(BaseModel):
    student_id: int
    subject_id: Optional[int] = None
    date: date
    status: str


class AttendanceBulkCreate(BaseModel):
    subject_id: Optional[int] = None
    date: date
    records: List[dict]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    subject_id: Optional[int]
    date: date
    status: str
    created_at: datetime
