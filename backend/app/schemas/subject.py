from pydantic import BaseModel, ConfigDict
from typing import Optional


class SubjectCreate(BaseModel):
    name: str
    code: str
    teacher_id: Optional[int] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[int] = None
    credits: int = 3


class SubjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    teacher_id: Optional[int]
    class_name: Optional[str]
    section: Optional[str]
    semester: Optional[int]
    credits: int
