from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User, UserRole
from app.models.event_ledger import CollegeEvent, EventLedgerItem, EventType, EventStatus, EntryType
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/finance/events", tags=["Event Financial Ledger & Expenses"])


class EventCreate(BaseModel):
    name: str
    event_type: Optional[str] = "FRESHER_PARTY"
    academic_year: Optional[str] = "2026-27"
    target_budget: Optional[float] = 0.0
    event_date: Optional[str] = None
    venue: Optional[str] = None
    coordinator_name: Optional[str] = None
    coordinator_contact: Optional[str] = None
    description: Optional[str] = None


class EventItemCreate(BaseModel):
    item_name: str
    entry_type: str  # INCOME or EXPENSE
    category: str    # Catering, DJ & Sound, Decoration, Student Contribution, Sponsorship, etc.
    amount: float
    payee_or_donor: Optional[str] = None
    payment_mode: Optional[str] = "UPI"
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    item_date: Optional[str] = None


def seed_sample_events_if_empty(db: Session):
    """Seed initial sample events (Fresher's Party, Farewell, Annual Fest) with ledger entries if none exist."""
    if db.query(CollegeEvent).count() == 0:
        freshers = CollegeEvent(
            name="Fresher's Welcome Party 2026",
            event_type=EventType.FRESHER_PARTY.value,
            academic_year="2026-27",
            target_budget=75000.0,
            event_date=date(2026, 9, 20),
            venue="Main College Auditorium & Lawn",
            coordinator_name="Prof. Sharma (Student Activity Council)",
            coordinator_contact="+91 98290 11223",
            status=EventStatus.ONGOING.value,
            description="Official Welcome Gala and Orientation Party for 1st Year Freshers Batch.",
        )
        db.add(freshers)
        db.flush()

        # Seed sample income & expenses for freshers
        items = [
            EventLedgerItem(
                event_id=freshers.id,
                item_name="Student Pass Contribution (150 passes @ ₹350)",
                entry_type=EntryType.INCOME.value,
                category="Student Contribution",
                amount=52500.0,
                payee_or_donor="2nd & 3rd Year Seniors Committee",
                payment_mode="UPI",
                reference_no="UPI/REC/FR-01",
                notes="Collected via UPI QR from 150 students",
                item_date=date(2026, 9, 1),
            ),
            EventLedgerItem(
                event_id=freshers.id,
                item_name="College Activity Grant Support",
                entry_type=EntryType.INCOME.value,
                category="College Grant",
                amount=25000.0,
                payee_or_donor="Aklank College Admin Trust Fund",
                payment_mode="BANK_TRANSFER",
                reference_no="TRF/ACT/2026/09",
                notes="Approved by College Principal",
                item_date=date(2026, 9, 2),
            ),
            EventLedgerItem(
                event_id=freshers.id,
                item_name="DJ, Sound System & Stage Lighting Setup",
                entry_type=EntryType.EXPENSE.value,
                category="DJ & Sound",
                amount=18000.0,
                payee_or_donor="Rockers Sound & Lights Kota",
                payment_mode="UPI",
                reference_no="BILL/RSL/491",
                notes="Includes 4 bass speakers, smoke machine & LED stage lights",
                item_date=date(2026, 9, 3),
            ),
            EventLedgerItem(
                event_id=freshers.id,
                item_name="Buffet Catering, Snacks & Welcome Drinks (200 pax)",
                entry_type=EntryType.EXPENSE.value,
                category="Catering & Food",
                amount=38500.0,
                payee_or_donor="Royal Rasoi Caterers",
                payment_mode="BANK_TRANSFER",
                reference_no="INV/RRC/2026/81",
                notes="₹190 per plate + welcome mocktails",
                item_date=date(2026, 9, 3),
            ),
            EventLedgerItem(
                event_id=freshers.id,
                item_name="Stage Backdrop, Balloon & Floral Decoration",
                entry_type=EntryType.EXPENSE.value,
                category="Decoration & Stage",
                amount=8500.0,
                payee_or_donor="Creative Arts Decorators",
                payment_mode="CASH",
                reference_no="VOUCH/CAD/102",
                notes="Photo booth corner and auditorium stage decor",
                item_date=date(2026, 9, 4),
            ),
            EventLedgerItem(
                event_id=freshers.id,
                item_name="Mr & Ms Fresher Sashes, Crowns & Mementos",
                entry_type=EntryType.EXPENSE.value,
                category="Gifts & Prizes",
                amount=4500.0,
                payee_or_donor="Kota Trophy & Gifts House",
                payment_mode="UPI",
                reference_no="UPI/KTG/8812",
                notes="Title sashes and 4 mementos",
                item_date=date(2026, 9, 4),
            ),
        ]
        db.add_all(items)

        # Also add Farewell party template
        farewell = CollegeEvent(
            name="Graduation Farewell Gala 2026 (Hasta La Vista)",
            event_type=EventType.FAREWELL_PARTY.value,
            academic_year="2025-26",
            target_budget=90000.0,
            event_date=date(2026, 5, 15),
            venue="Grand Banquet Hall, Campus North",
            coordinator_name="Dr. Verma (Cultural Committee)",
            coordinator_contact="+91 94140 55667",
            status=EventStatus.SETTLED.value,
            description="Farewell evening celebrating the graduating batch of 2026.",
        )
        db.add(farewell)
        db.flush()

        farewell_items = [
            EventLedgerItem(
                event_id=farewell.id,
                item_name="Junior Student Fee Collection (180 students @ ₹400)",
                entry_type=EntryType.INCOME.value,
                category="Student Contribution",
                amount=72000.0,
                payee_or_donor="Pre-final Year Farewell Committee",
                payment_mode="UPI",
                reference_no="UPI/FAR/2026-01",
                notes="100% target collection achieved",
                item_date=date(2026, 5, 10),
            ),
            EventLedgerItem(
                event_id=farewell.id,
                item_name="Local Sponsor Banner Ad - Career Point",
                entry_type=EntryType.INCOME.value,
                category="Sponsorship",
                amount=20000.0,
                payee_or_donor="Career Point Institute",
                payment_mode="CHEQUE",
                reference_no="CHQ/491028",
                notes="Title event sponsor",
                item_date=date(2026, 5, 12),
            ),
            EventLedgerItem(
                event_id=farewell.id,
                item_name="Grand Dinner Buffet (220 pax)",
                entry_type=EntryType.EXPENSE.value,
                category="Catering & Food",
                amount=49000.0,
                payee_or_donor="Shree Maya Catering Services",
                payment_mode="BANK_TRANSFER",
                reference_no="NEFT/SMC/88219",
                notes="Comprehensive dinner buffet",
                item_date=date(2026, 5, 15),
            ),
            EventLedgerItem(
                event_id=farewell.id,
                item_name="DJ Night & Laser Show",
                entry_type=EntryType.EXPENSE.value,
                category="DJ & Sound",
                amount=22000.0,
                payee_or_donor="Vibe Beats Productions",
                payment_mode="UPI",
                reference_no="UPI/VBP/9018",
                notes="Complete 4-hour DJ setup",
                item_date=date(2026, 5, 15),
            ),
            EventLedgerItem(
                event_id=farewell.id,
                item_name="Professional Photography & Videography (with drone)",
                entry_type=EntryType.EXPENSE.value,
                category="Photography & Media",
                amount=12000.0,
                payee_or_donor="LensCraft Studios Kota",
                payment_mode="UPI",
                reference_no="UPI/LCS/7710",
                notes="Full event photo album & cinematic reel",
                item_date=date(2026, 5, 15),
            ),
        ]
        db.add_all(farewell_items)
        db.commit()


@router.get("")
def list_events(
    search: Optional[str] = None,
    event_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin),
):
    """
    List all college events with calculated totals:
    Total Collected (Income), Total Expenditure (Spent), Net Balance (Surplus/Deficit).
    """
    seed_sample_events_if_empty(db)

    q = db.query(CollegeEvent)
    if search:
        q = q.filter(CollegeEvent.name.ilike(f"%{search}%") | CollegeEvent.venue.ilike(f"%{search}%"))
    if event_type and event_type != "ALL":
        q = q.filter(CollegeEvent.event_type == event_type)
    if academic_year and academic_year != "ALL":
        q = q.filter(CollegeEvent.academic_year == academic_year)
    if status and status != "ALL":
        q = q.filter(CollegeEvent.status == status)

    events = q.order_by(desc(CollegeEvent.event_date)).all()

    overall_collected = 0.0
    overall_spent = 0.0

    result = []
    for ev in events:
        items = db.query(EventLedgerItem).filter(EventLedgerItem.event_id == ev.id).all()
        collected = sum(i.amount for i in items if i.entry_type == EntryType.INCOME.value)
        spent = sum(i.amount for i in items if i.entry_type == EntryType.EXPENSE.value)
        balance = collected - spent

        overall_collected += collected
        overall_spent += spent

        result.append({
            "id": ev.id,
            "name": ev.name,
            "event_type": ev.event_type,
            "academic_year": ev.academic_year,
            "target_budget": ev.target_budget,
            "event_date": ev.event_date.isoformat() if ev.event_date else None,
            "venue": ev.venue,
            "coordinator_name": ev.coordinator_name,
            "coordinator_contact": ev.coordinator_contact,
            "status": ev.status,
            "description": ev.description,
            "total_collected": round(collected, 2),
            "total_spent": round(spent, 2),
            "net_balance": round(balance, 2),
            "items_count": len(items),
        })

    return {
        "count": len(result),
        "overall_summary": {
            "total_events": len(result),
            "overall_collected": round(overall_collected, 2),
            "overall_spent": round(overall_spent, 2),
            "overall_net_surplus": round(overall_collected - overall_spent, 2),
        },
        "events": result,
    }


@router.post("", status_code=201)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Admin create new college event (Fresher, Farewell, Sports Meet, etc.)."""
    ev_date = None
    if payload.event_date:
        try:
            ev_date = datetime.strptime(payload.event_date, "%Y-%m-%d").date()
        except ValueError:
            ev_date = date.today()
    else:
        ev_date = date.today()

    new_event = CollegeEvent(
        name=payload.name.strip(),
        event_type=payload.event_type or EventType.FRESHER_PARTY.value,
        academic_year=payload.academic_year or "2026-27",
        target_budget=payload.target_budget or 0.0,
        event_date=ev_date,
        venue=payload.venue,
        coordinator_name=payload.coordinator_name,
        coordinator_contact=payload.coordinator_contact,
        description=payload.description,
        status=EventStatus.UPCOMING.value,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return {"message": "Event created successfully", "event_id": new_event.id}


@router.get("/{event_id}")
def get_event_details(
    event_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_teacher_or_admin),
):
    """Get detailed financial ledger for an event with category breakdown."""
    ev = db.query(CollegeEvent).filter(CollegeEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    items = db.query(EventLedgerItem).filter(EventLedgerItem.event_id == event_id).order_by(desc(EventLedgerItem.item_date), desc(EventLedgerItem.id)).all()

    income_items = []
    expense_items = []
    income_categories = {}
    expense_categories = {}

    total_income = 0.0
    total_expense = 0.0

    for item in items:
        item_dict = {
            "id": item.id,
            "item_name": item.item_name,
            "entry_type": item.entry_type,
            "category": item.category,
            "amount": item.amount,
            "payee_or_donor": item.payee_or_donor,
            "payment_mode": item.payment_mode,
            "reference_no": item.reference_no,
            "notes": item.notes,
            "item_date": item.item_date.isoformat() if item.item_date else None,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        if item.entry_type == EntryType.INCOME.value:
            income_items.append(item_dict)
            total_income += item.amount
            income_categories[item.category] = income_categories.get(item.category, 0.0) + item.amount
        else:
            expense_items.append(item_dict)
            total_expense += item.amount
            expense_categories[item.category] = expense_categories.get(item.category, 0.0) + item.amount

    return {
        "event": {
            "id": ev.id,
            "name": ev.name,
            "event_type": ev.event_type,
            "academic_year": ev.academic_year,
            "target_budget": ev.target_budget,
            "event_date": ev.event_date.isoformat() if ev.event_date else None,
            "venue": ev.venue,
            "coordinator_name": ev.coordinator_name,
            "coordinator_contact": ev.coordinator_contact,
            "status": ev.status,
            "description": ev.description,
        },
        "summary": {
            "total_collected": round(total_income, 2),
            "total_spent": round(total_expense, 2),
            "net_balance": round(total_income - total_expense, 2),
            "target_budget": ev.target_budget,
            "budget_utilized_pct": round((total_expense / ev.target_budget * 100.0), 1) if ev.target_budget > 0 else 0.0,
        },
        "income_categories": income_categories,
        "expense_categories": expense_categories,
        "items": [
            {
                "id": i.id,
                "item_name": i.item_name,
                "entry_type": i.entry_type,
                "category": i.category,
                "amount": i.amount,
                "payee_or_donor": i.payee_or_donor,
                "payment_mode": i.payment_mode,
                "reference_no": i.reference_no,
                "notes": i.notes,
                "item_date": i.item_date.isoformat() if i.item_date else None,
            }
            for i in items
        ]
    }


@router.post("/{event_id}/items", status_code=201)
def add_event_item(
    event_id: int,
    payload: EventItemCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Add a collection (INCOME) or expense (EXPENSE) entry to an event."""
    ev = db.query(CollegeEvent).filter(CollegeEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    item_dt = None
    if payload.item_date:
        try:
            item_dt = datetime.strptime(payload.item_date, "%Y-%m-%d").date()
        except ValueError:
            item_dt = date.today()
    else:
        item_dt = date.today()

    new_item = EventLedgerItem(
        event_id=event_id,
        item_name=payload.item_name.strip(),
        entry_type=payload.entry_type.upper(),
        category=payload.category.strip(),
        amount=float(payload.amount),
        payee_or_donor=payload.payee_or_donor,
        payment_mode=payload.payment_mode or "UPI",
        reference_no=payload.reference_no,
        notes=payload.notes,
        item_date=item_dt,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": "Item added successfully", "item_id": new_item.id}


@router.delete("/{event_id}/items/{item_id}")
def delete_event_item(
    event_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Delete an income/expense item from an event."""
    item = db.query(EventLedgerItem).filter(EventLedgerItem.id == item_id, EventLedgerItem.event_id == event_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}


@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Delete an event and all its ledger items."""
    ev = db.query(CollegeEvent).filter(CollegeEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(ev)
    db.commit()
    return {"message": "Event deleted successfully"}
