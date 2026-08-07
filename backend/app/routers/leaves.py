from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.leave import Leave, LeaveStatus
from app.models.user import User
from app.schemas.leave import LeaveCreate, LeaveReview
from app.utils.auth_deps import get_current_user, require_teacher_or_admin, require_student

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])


@router.post("", status_code=201)
def apply_leave(data: LeaveCreate, current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    leave = Leave(student_id=current_user.id, reason=data.reason,
                  from_date=data.from_date, to_date=data.to_date)
    db.add(leave)
    db.commit()
    return {"message": "Leave application submitted"}


@router.get("/my")
def my_leaves(current_user: User = Depends(require_student), db: Session = Depends(get_db)):
    leaves = db.query(Leave).filter(Leave.student_id == current_user.id).all()
    return {"leaves": [{"id": l.id, "reason": l.reason, "from_date": l.from_date,
                         "to_date": l.to_date,
                         "status": l.status.value if hasattr(l.status, "value") else str(l.status),
                         "applied_at": l.applied_at} for l in leaves]}


@router.get("")
def all_leaves(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    leaves = db.query(Leave).order_by(Leave.applied_at.desc()).all()
    return {"leaves": [{"id": l.id, "student_id": l.student_id, "reason": l.reason,
                         "from_date": l.from_date, "to_date": l.to_date,
                         "status": l.status.value if hasattr(l.status, "value") else str(l.status),
                         "applied_at": l.applied_at} for l in leaves]}


@router.put("/{leave_id}/review")
def review_leave(
    leave_id: int, data: LeaveReview,
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    leave = db.query(Leave).filter(Leave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    leave.status = LeaveStatus(data.status)
    leave.reviewed_by_id = current_user.id
    leave.review_remarks = data.review_remarks
    db.commit()
    return {"message": f"Leave {data.status}"}
