from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import os, shutil

from app.database import get_db
from app.models.assignment import Assignment, Submission, SubmissionStatus
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate, GradeSubmission
from app.utils.auth_deps import get_current_user, require_teacher_or_admin, require_student
from app.config import settings
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])


@router.get("")
def list_assignments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    assignments = db.query(Assignment).filter(Assignment.is_active == True).all()
    return {"assignments": [
        {"id": a.id, "title": a.title, "description": a.description,
         "deadline": a.deadline, "subject_id": a.subject_id,
         "teacher_id": a.teacher_id, "max_marks": a.max_marks, "created_at": a.created_at}
        for a in assignments]}


@router.post("", status_code=201)
def create_assignment(
    data: AssignmentCreate,
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    assignment = Assignment(title=data.title, description=data.description,
                            deadline=data.deadline, subject_id=data.subject_id,
                            teacher_id=current_user.id, max_marks=data.max_marks)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Assignment created", "id": assignment.id}


@router.put("/{assignment_id}")
def update_assignment(
    assignment_id: int, data: AssignmentUpdate,
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(a, field, val)
    db.commit()
    return {"message": "Assignment updated"}


@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    a = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    a.is_active = False
    db.commit()
    return {"message": "Assignment deleted"}


@router.post("/{assignment_id}/submit", status_code=201)
async def submit_assignment(
    assignment_id: int,
    text_content: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    a = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.is_active == True).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")
    existing = db.query(Submission).filter(
        Submission.assignment_id == assignment_id, Submission.student_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already submitted")
    file_path = None
    if file:
        content = await file.read()
        file_path = await storage_service.upload_file(
            file_content=content,
            original_filename=file.filename,
            bucket_name="submissions",
            content_type=file.content_type
        )
    is_late = datetime.utcnow() > a.deadline
    sub = Submission(assignment_id=assignment_id, student_id=current_user.id,
                     text_content=text_content, file_path=file_path,
                     status=SubmissionStatus.late if is_late else SubmissionStatus.submitted)
    db.add(sub)
    db.commit()
    return {"message": "Assignment submitted", "late": is_late, "file_url": file_path}


@router.get("/{assignment_id}/submissions")
def get_submissions(assignment_id: int, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    return {"submissions": [
        {"id": s.id, "student_id": s.student_id, "status": s.status.value,
         "submitted_at": s.submitted_at, "marks_obtained": s.marks_obtained,
         "grade": s.grade, "feedback": s.feedback} for s in subs]}


@router.put("/submissions/{submission_id}/grade")
def grade_submission(
    submission_id: int, data: GradeSubmission,
    _=Depends(require_teacher_or_admin), db: Session = Depends(get_db),
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.marks_obtained = data.marks_obtained
    sub.grade = data.grade
    sub.feedback = data.feedback
    sub.status = SubmissionStatus.graded
    db.commit()
    return {"message": "Submission graded"}
