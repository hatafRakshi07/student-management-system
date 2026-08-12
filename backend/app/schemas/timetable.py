from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import time


class TimetableCreate(BaseModel):
    class_name: str
    section: Optional[str] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    day_of_week: str
    start_time: time
    end_time: time
    room: Optional[str] = None


class TimetableOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_name: str
    section: Optional[str]
    subject_id: Optional[int]
    teacher_id: Optional[int]
    day_of_week: str
    start_time: time
    end_time: time
    room: Optional[str]
