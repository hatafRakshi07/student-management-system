from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class FeeCreate(BaseModel):
    student_id: int
    amount: float
    fee_type: str = "tuition"
    description: Optional[str] = None
    due_date: datetime


class FeeUpdate(BaseModel):
    status: Optional[str] = None
    payment_date: Optional[datetime] = None
    transaction_id: Optional[str] = None


class FeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    amount: float
    fee_type: str
    description: Optional[str]
    due_date: datetime
    payment_date: Optional[datetime]
    status: str
    transaction_id: Optional[str]
    created_at: datetime
