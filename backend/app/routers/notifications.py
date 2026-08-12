from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.auth_deps import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def my_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = (db.query(Notification)
              .filter(Notification.user_id == current_user.id)
              .order_by(Notification.created_at.desc()).limit(50).all())
    unread = sum(1 for n in notifs if not n.is_read)
    return {"unread": unread, "notifications": [
        {"id": n.id, "title": n.title, "message": n.message,
         "type": n.notification_type, "is_read": n.is_read, "created_at": n.created_at.isoformat() if n.created_at else None}
        for n in notifs]}


@router.put("/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Marked as read"}


@router.put("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
