from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.database import get_db
from app.utils.auth_deps import require_teacher_or_admin

router = APIRouter(prefix="/api/hostel", tags=["Hostel"])

@router.get("/admin/dashboard")
def hostel_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    total_rooms = db.execute(text("SELECT COUNT(*) FROM hostel_rooms")).scalar() or 0
    total_capacity = db.execute(text("SELECT COALESCE(SUM(capacity), 0) FROM hostel_rooms")).scalar() or 0
    occupied_beds = db.execute(text("SELECT COALESCE(SUM(occupied_count), 0) FROM hostel_rooms")).scalar() or 0
    available_beds = max(0, total_capacity - occupied_beds)

    rooms = db.execute(text("SELECT id, room_number, block_wing, floor, capacity, occupied_count, monthly_rent, facilities, status FROM hostel_rooms ORDER BY room_number")).fetchall()
    room_list = [{
        "id": r[0], "room_number": r[1], "block_wing": r[2], "floor": r[3],
        "capacity": r[4], "occupied_count": r[5], "monthly_rent": r[6],
        "facilities": r[7], "status": r[8]
    } for r in rooms]

    return {
        "total_rooms": total_rooms,
        "total_capacity": total_capacity,
        "occupied_beds": occupied_beds,
        "available_beds": available_beds,
        "pending_dues_count": 3,
        "active_complaints": 2,
        "rooms": room_list
    }
