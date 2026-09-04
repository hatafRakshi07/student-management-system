from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models.user import User, UserRole
from app.models.notes import StudyNote
from app.utils.auth_deps import get_current_user, require_teacher_or_admin
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/notes", tags=["Study Notes & Materials"])


@router.get("")
def list_notes(
    search: Optional[str] = None,
    subject: Optional[str] = None,
    department: Optional[str] = None,
    class_name: Optional[str] = None,
    semester: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List study notes and materials for students and teachers.
    Supports filtering by subject, department, class_name, semester, and search query.
    """
    q = db.query(StudyNote, User).join(User, StudyNote.teacher_id == User.id).filter(StudyNote.is_active == True)

    if search:
        search_fmt = f"%{search}%"
        q = q.filter(
            or_(
                StudyNote.title.ilike(search_fmt),
                StudyNote.description.ilike(search_fmt),
                StudyNote.subject.ilike(search_fmt),
                User.full_name.ilike(search_fmt),
            )
        )
    if subject and subject != "ALL":
        q = q.filter(StudyNote.subject == subject)
    if department and department != "ALL":
        q = q.filter(StudyNote.department == department)
    if class_name and class_name != "ALL":
        q = q.filter(StudyNote.class_name == class_name)
    if semester and semester != "ALL":
        q = q.filter(StudyNote.semester == semester)

    total = q.count()
    results = q.order_by(desc(StudyNote.id)).offset(skip).limit(limit).all()

    notes_list = []
    for note, teacher in results:
        notes_list.append({
            "id": note.id,
            "title": note.title,
            "description": note.description,
            "subject": note.subject,
            "department": note.department,
            "class_name": note.class_name,
            "semester": note.semester,
            "file_url": note.file_url,
            "file_name": note.file_name,
            "file_type": note.file_type,
            "file_size_bytes": note.file_size_bytes,
            "teacher_name": teacher.full_name,
            "teacher_id": teacher.id,
            "created_at": note.created_at.isoformat() if hasattr(note.created_at, "isoformat") else str(note.created_at),
        })

    return {"total": total, "notes": notes_list}


@router.post("/upload", status_code=201)
async def upload_note(
    title: str = Form(...),
    subject: str = Form(...),
    description: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    class_name: Optional[str] = Form(None),
    semester: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """
    Teacher/Admin upload new lecture notes or study material with file attachment.
    Persists file to Supabase Cloud Storage (with local disk fallback).
    """
    if not title.strip() or not subject.strip():
        raise HTTPException(status_code=400, detail="Title and Subject are required")

    content = await file.read()
    file_size = len(content)
    orig_filename = file.filename or "notes.pdf"
    ext = orig_filename.split(".")[-1].lower() if "." in orig_filename else "pdf"

    # Upload using cloud storage service
    file_url = await storage_service.upload_file(
        file_content=content,
        original_filename=orig_filename,
        bucket_name="materials",
        content_type=file.content_type,
    )

    new_note = StudyNote(
        title=title.strip(),
        subject=subject.strip(),
        description=description.strip() if description else None,
        department=department.strip() if department else None,
        class_name=class_name.strip() if class_name else None,
        semester=semester.strip() if semester else None,
        file_url=file_url,
        file_name=orig_filename,
        file_type=ext,
        file_size_bytes=file_size,
        teacher_id=current_user.id,
    )

    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {
        "message": "Study notes uploaded successfully",
        "note": {
            "id": new_note.id,
            "title": new_note.title,
            "subject": new_note.subject,
            "file_url": new_note.file_url,
            "file_name": new_note.file_name,
            "created_at": new_note.created_at.isoformat(),
        }
    }


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    current_user: User = Depends(require_teacher_or_admin),
    db: Session = Depends(get_db),
):
    """Delete a note (Teacher can only delete their own notes unless Admin)."""
    note = db.query(StudyNote).filter(StudyNote.id == note_id, StudyNote.is_active == True).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if current_user.role != UserRole.admin and note.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete notes you uploaded")

    note.is_active = False
    db.commit()
    return {"message": "Note deleted successfully"}
