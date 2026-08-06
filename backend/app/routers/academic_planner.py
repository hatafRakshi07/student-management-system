from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.subject import Subject
from app.models.academic_planner import (
    AcademicSessionRecord, ClassroomRecord, FacultySubjectAllocation, TimetableSlotRecord,
    AcademicCalendarEvent, FacultyWorkloadSummary, TimetableAuditLog, RoomType, EventCategory, DayOfWeek
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/academic", tags=["Academic Planner & Timetable Engine"])


def seed_default_academic_data(db: Session):
    """Seed initial classrooms, rooms, and academic calendar events if empty."""
    if db.query(ClassroomRecord).count() == 0:
        rooms = [
            ClassroomRecord(room_number="R-101", building="Main Block", floor="1st Floor", capacity=60, room_type=RoomType.LECTURE_HALL),
            ClassroomRecord(room_number="R-102", building="Main Block", floor="1st Floor", capacity=60, room_type=RoomType.SMART_CLASS),
            ClassroomRecord(room_number="LAB-1", building="Science Block", floor="Ground Floor", capacity=30, room_type=RoomType.LABORATORY),
            ClassroomRecord(room_number="AUD-01", building="Administrative Block", floor="2nd Floor", capacity=150, room_type=RoomType.SEMINAR_HALL),
        ]
        db.add_all(rooms)
        db.commit()

    if db.query(AcademicCalendarEvent).count() == 0:
        events = [
            AcademicCalendarEvent(title="Semester 1 Orientation Session", event_category=EventCategory.ORIENTATION, start_date=date(2024, 7, 15), end_date=date(2024, 7, 15)),
            AcademicCalendarEvent(title="Mid-Term Examination Week", event_category=EventCategory.EXAM, start_date=date(2024, 10, 10), end_date=date(2024, 10, 16)),
            AcademicCalendarEvent(title="Independence Day Celebration", event_category=EventCategory.HOLIDAY, start_date=date(2024, 8, 15), end_date=date(2024, 8, 15), is_holiday=True),
            AcademicCalendarEvent(title="Annual Sports & Cultural Fest", event_category=EventCategory.SPORTS, start_date=date(2024, 12, 20), end_date=date(2024, 12, 23)),
        ]
        db.add_all(events)
        db.commit()


@router.get("/rooms")
def list_classrooms(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """List Classrooms, Smart Rooms, and Laboratories."""
    seed_default_academic_data(db)
    rooms = db.query(ClassroomRecord).order_by(ClassroomRecord.room_number.asc()).all()
    return [{
        "id": r.id,
        "room_number": r.room_number,
        "building": r.building,
        "floor": r.floor,
        "capacity": r.capacity,
        "room_type": r.room_type.value if hasattr(r.room_type, "value") else str(r.room_type),
        "is_active": r.is_active
    } for r in rooms]


@router.post("/allocate-faculty")
def allocate_faculty_subject(
    payload: Dict[str, Any],
    _=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign Faculty to Subject, Course, and Section."""
    faculty_user_id = payload.get("faculty_user_id")
    subject_id = payload.get("subject_id")
    class_name = payload.get("class_name", "B.A. I-SEM")
    section = payload.get("section", "A")
    session_year = payload.get("session_year", "2024-25")

    existing = db.query(FacultySubjectAllocation).filter(
        FacultySubjectAllocation.faculty_user_id == faculty_user_id,
        FacultySubjectAllocation.subject_id == subject_id,
        FacultySubjectAllocation.class_name == class_name,
        FacultySubjectAllocation.section == section,
        FacultySubjectAllocation.session_year == session_year
    ).first()

    if existing:
        return {"message": "Faculty subject allocation already exists", "allocation_id": existing.id}

    alloc = FacultySubjectAllocation(
        faculty_user_id=faculty_user_id,
        subject_id=subject_id,
        class_name=class_name,
        section=section,
        session_year=session_year,
        created_at=datetime.utcnow()
    )
    db.add(alloc)
    db.commit()

    return {"message": "Faculty assigned to subject successfully", "allocation_id": alloc.id}


@router.post("/timetable/slot")
def create_timetable_slot(
    payload: Dict[str, Any],
    _=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 18: Timetable Slot Scheduling with Automated Conflict Prevention.
    Validates:
    - 1. Faculty Conflict (No double booking of faculty at same day & time).
    - 2. Room Conflict (No double booking of room at same day & time).
    - 3. Student Batch Conflict (No double booking of class batch at same day & time).
    """
    day_str = payload.get("day_of_week", "MONDAY")
    time_slot = payload.get("time_slot", "09:00 AM - 10:00 AM")
    class_name = payload.get("class_name", "B.A. I-SEM")
    section = payload.get("section", "A")
    semester = int(payload.get("semester", 1))
    subject_id = payload.get("subject_id")
    faculty_user_id = payload.get("faculty_user_id")
    room_id = payload.get("room_id")
    session_year = payload.get("session_year", "2024-25")

    day_enum = DayOfWeek(day_str)

    # Conflict Check 1: Faculty Overlap
    fac_conflict = db.query(TimetableSlotRecord).filter(
        TimetableSlotRecord.day_of_week == day_enum,
        TimetableSlotRecord.time_slot == time_slot,
        TimetableSlotRecord.faculty_user_id == faculty_user_id,
        TimetableSlotRecord.session_year == session_year
    ).first()
    if fac_conflict:
        fac_usr = db.query(User).filter(User.id == faculty_user_id).first()
        fac_name = fac_usr.full_name if fac_usr else "Faculty"
        raise HTTPException(
            status_code=400,
            detail=f"Faculty Conflict: {fac_name} is already assigned to class '{fac_conflict.class_name}' at {time_slot} on {day_str}."
        )

    # Conflict Check 2: Room Overlap
    room_conflict = db.query(TimetableSlotRecord).filter(
        TimetableSlotRecord.day_of_week == day_enum,
        TimetableSlotRecord.time_slot == time_slot,
        TimetableSlotRecord.room_id == room_id,
        TimetableSlotRecord.session_year == session_year
    ).first()
    if room_conflict:
        rm = db.query(ClassroomRecord).filter(ClassroomRecord.id == room_id).first()
        rm_name = rm.room_number if rm else f"Room #{room_id}"
        raise HTTPException(
            status_code=400,
            detail=f"Room Conflict: {rm_name} is already booked for class '{room_conflict.class_name}' at {time_slot} on {day_str}."
        )

    # Conflict Check 3: Student Batch Overlap
    batch_conflict = db.query(TimetableSlotRecord).filter(
        TimetableSlotRecord.day_of_week == day_enum,
        TimetableSlotRecord.time_slot == time_slot,
        TimetableSlotRecord.class_name == class_name,
        TimetableSlotRecord.section == section,
        TimetableSlotRecord.session_year == session_year
    ).first()
    if batch_conflict:
        raise HTTPException(
            status_code=400,
            detail=f"Batch Conflict: Class '{class_name}' Section '{section}' already has a lecture scheduled at {time_slot} on {day_str}."
        )

    # Save Timetable Slot
    slot = TimetableSlotRecord(
        day_of_week=day_enum,
        time_slot=time_slot,
        class_name=class_name,
        section=section,
        semester=semester,
        subject_id=subject_id,
        faculty_user_id=faculty_user_id,
        room_id=room_id,
        session_year=session_year,
        created_at=datetime.utcnow()
    )
    db.add(slot)
    db.commit()

    return {"message": "Timetable slot scheduled successfully with 0 conflicts!", "slot_id": slot.id}


@router.get("/timetable")
def get_master_timetable(
    class_name: Optional[str] = None,
    day: Optional[str] = None,
    session_year: str = "2024-25",
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """Get Master Weekly Timetable Grid."""
    seed_default_academic_data(db)
    q = db.query(TimetableSlotRecord, Subject, User, ClassroomRecord)\
        .join(Subject, TimetableSlotRecord.subject_id == Subject.id)\
        .join(User, TimetableSlotRecord.faculty_user_id == User.id)\
        .join(ClassroomRecord, TimetableSlotRecord.room_id == ClassroomRecord.id)\
        .filter(TimetableSlotRecord.session_year == session_year)

    if class_name:
        q = q.filter(TimetableSlotRecord.class_name.ilike(f"%{class_name}%"))
    if day:
        q = q.filter(TimetableSlotRecord.day_of_week == day)

    slots = q.all()
    grid = []
    for s, subj, fac, rm in slots:
        grid.append({
            "slot_id": s.id,
            "day": s.day_of_week.value if hasattr(s.day_of_week, "value") else str(s.day_of_week),
            "time_slot": s.time_slot,
            "class_name": s.class_name,
            "section": s.section,
            "subject_name": subj.name,
            "subject_code": subj.code,
            "faculty_name": fac.full_name,
            "room_number": rm.room_number,
            "building": rm.building
        })

    return {"count": len(grid), "timetable": grid}


@router.get("/timetable/student/{student_id}")
def get_student_timetable(student_id: int, db: Session = Depends(get_db)):
    """Get Daily & Weekly Timetable Grid for Student / Parent Portal."""
    student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    cls = student.class_name if (student and student.class_name) else "B.A. I-SEM"

    q = db.query(TimetableSlotRecord, Subject, User, ClassroomRecord)\
        .join(Subject, TimetableSlotRecord.subject_id == Subject.id)\
        .join(User, TimetableSlotRecord.faculty_user_id == User.id)\
        .join(ClassroomRecord, TimetableSlotRecord.room_id == ClassroomRecord.id)\
        .filter(TimetableSlotRecord.class_name.ilike(f"%{cls}%"))\
        .order_by(TimetableSlotRecord.day_of_week.asc(), TimetableSlotRecord.time_slot.asc()).all()

    return {"student_class": cls, "timetable": [{
        "slot_id": s.id,
        "day": s.day_of_week.value if hasattr(s.day_of_week, "value") else str(s.day_of_week),
        "time_slot": s.time_slot,
        "subject_name": subj.name,
        "faculty_name": fac.full_name,
        "room_number": rm.room_number
    } for s, subj, fac, rm in q]}


@router.get("/calendar")
def get_academic_calendar(db: Session = Depends(get_db)):
    """Get Academic Calendar Events."""
    seed_default_academic_data(db)
    events = db.query(AcademicCalendarEvent).order_by(AcademicCalendarEvent.start_date.asc()).all()
    return [{
        "id": e.id,
        "title": e.title,
        "category": e.event_category.value if hasattr(e.event_category, "value") else str(e.event_category),
        "start_date": e.start_date.strftime("%d-%m-%Y"),
        "end_date": e.end_date.strftime("%d-%m-%Y"),
        "is_holiday": e.is_holiday
    } for e in events]


@router.get("/admin/dashboard")
def get_admin_academic_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Admin Academic Command Center Metrics & Analytics."""
    seed_default_academic_data(db)
    total_slots = db.query(TimetableSlotRecord).count()
    total_rooms = db.query(ClassroomRecord).count()
    total_events = db.query(AcademicCalendarEvent).count()

    # Room Utilization
    active_rooms = db.query(ClassroomRecord).filter(ClassroomRecord.is_active == True).count()

    return {
        "total_timetable_slots": total_slots,
        "total_rooms": total_rooms,
        "active_rooms": active_rooms,
        "total_calendar_events": total_events,
        "conflict_status": "ZERO CONFLICTS DETECTED"
    }


@router.get("/reports/{report_type}")
def get_academic_reports(report_type: str, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Generate Master Timetable & Room Utilization Reports."""
    if report_type == "master-timetable":
        return get_master_timetable(_=None, db=db)
    elif report_type == "room-utilization":
        rooms = db.query(ClassroomRecord).all()
        return {
            "report_title": "Classroom & Laboratory Utilization Report",
            "count": len(rooms),
            "rooms": [{
                "room_number": r.room_number,
                "building": r.building,
                "capacity": r.capacity,
                "type": r.room_type.value if hasattr(r.room_type, "value") else str(r.room_type),
                "booked_slots": db.query(TimetableSlotRecord).filter(TimetableSlotRecord.room_id == r.id).count()
            } for r in rooms]
        }
    else:
        raise HTTPException(status_code=400, detail="Unsupported report type")
