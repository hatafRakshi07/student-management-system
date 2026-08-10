from sqlalchemy.orm import Session
from app.models.user import User
from app.services.ai_service import chat_with_ai


def handle_chat(message: str, user: User, db: Session) -> str:
    """Route chatbot messages through the AI service."""
    return chat_with_ai(message, user, db)


async def process_chatbot_query(message: str, user: User, db: Session) -> str:
    """Async wrapper for chatbot query processing."""
    return handle_chat(message, user, db)

