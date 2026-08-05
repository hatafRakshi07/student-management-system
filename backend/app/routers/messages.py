from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.message import Message
from app.utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


class MessageCreate(BaseModel):
    recipient_id: int
    content: str


class MessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    is_read: bool
    created_at: datetime


@router.post("/send", status_code=201)
async def send_message(
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipient = db.query(User).filter(User.id == data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found")
    
    msg = Message(
        sender_id=current_user.id,
        recipient_id=data.recipient_id,
        content=data.content
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Send via websocket if recipient is online
    try:
        from app.routers.websockets import manager
        await manager.send_personal_message({
            "type": "new_message",
            "message_id": msg.id,
            "sender_id": current_user.id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        }, data.recipient_id)
    except Exception:
        pass

    return {"message": "Message sent successfully", "id": msg.id}



@router.get("/conversation/{other_user_id}")
def get_conversation(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.recipient_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.recipient_id == current_user.id)
        )
    ).order_by(Message.created_at.asc()).all()

    return {"messages": [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "recipient_id": m.recipient_id,
            "content": m.content,
            "is_read": m.is_read,
            "created_at": m.created_at
        } for m in messages
    ]}


@router.put("/read/{message_id}")
def mark_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = db.query(Message).filter(Message.id == message_id, Message.recipient_id == current_user.id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found or unauthorized")
    msg.is_read = True
    db.commit()
    return {"message": "Marked as read"}
