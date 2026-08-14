from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.utils.auth_deps import get_current_user
from app.services.ai_service import chat_with_ai

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None


@router.post("/chat")
def chat(data: ChatMessage, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Route chatbot messages through the AI service."""
    response = chat_with_ai(data.message, current_user, db)
    return {
        "response": response,
        "conversation_id": data.conversation_id or f"{current_user.id}_chat"
    }
