from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.services.ai_service import (
    predict_performance, get_ai_recommendations,
    chat_with_ai, get_grade_prediction,
)
from app.utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI"])


class ChatMessage(BaseModel):
    message: str


@router.get("/performance/{student_id}")
def performance_prediction(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Random Forest: classify student performance level with confidence scores."""
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return predict_performance(student_id, db)


@router.get("/grade-prediction/{student_id}")
def grade_prediction(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Linear Regression: predict final exam marks and letter grade."""
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return get_grade_prediction(student_id, db)


@router.get("/recommendations/{student_id}")
def ai_recommendations(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role == "student" and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return get_ai_recommendations(student_id, db)


@router.post("/chat")
def ai_chat(msg: ChatMessage, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response = chat_with_ai(msg.message, current_user, db)
    return {"response": response}
