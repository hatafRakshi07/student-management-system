from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.notice import Notice, TargetRole
from app.models.user import User
from app.schemas.notice import NoticeCreate
from app.utils.auth_deps import get_current_user, require_teacher_or_admin

router = APIRouter(prefix="/api/notices", tags=["Notices"])


@router.get("")
def list_notices(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    try:
        t_role = TargetRole(role)
    except Exception:
        t_role = TargetRole.all
    notices = db.query(Notice).filter(
        Notice.is_active == 1,
        (Notice.target_role == TargetRole.all) | (Notice.target_role == t_role)
    ).order_by(Notice.created_at.desc()).all()
    return {"notices": [
        {"id": n.id, "title": n.title, "description": n.description,
         "created_at": n.created_at,
         "target_role": n.target_role.value if hasattr(n.target_role, 'value') else str(n.target_role),
         "created_by_id": n.created_by_id} for n in notices]}


@router.post("", status_code=201)
def create_notice(
    data: NoticeCreate,
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    notice = Notice(title=data.title, description=data.description,
                    target_role=TargetRole(data.target_role), created_by_id=current_user.id)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return {"message": "Notice published", "id": notice.id}


@router.delete("/{notice_id}")
def delete_notice(notice_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    n = db.query(Notice).filter(Notice.id == notice_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notice not found")
    n.is_active = 0
    db.commit()
    return {"message": "Notice deleted"}
