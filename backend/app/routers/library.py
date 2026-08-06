from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

from app.database import get_db
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.library import (
    LibraryBookRecord, LibraryMemberRecord, LibraryIssueTransaction, LibraryBookReservation,
    LibraryFineRecord, LibraryAuditLog, BookStatus, MemberType, IssueStatus, FineStatus
)
from app.utils.auth_deps import require_admin, require_teacher_or_admin, get_current_user

router = APIRouter(prefix="/api/library", tags=["Library Management System"])


def seed_default_library_catalog(db: Session):
    """Seed default book catalog records if library is empty."""
    if db.query(LibraryBookRecord).count() == 0:
        books = [
            LibraryBookRecord(accession_no="ACC-001", isbn="978-0131103627", title="The C Programming Language", author="Brian W. Kernighan, Dennis M. Ritchie", publisher="Prentice Hall", subject="Computer Science", department="Computer Science", shelf_rack="Shelf CS-1", total_copies=10, available_copies=10, barcode_token="BAR-CS-001"),
            LibraryBookRecord(accession_no="ACC-002", isbn="978-0262033848", title="Introduction to Algorithms", author="Thomas H. Cormen", publisher="MIT Press", subject="Data Structures", department="Computer Science", shelf_rack="Shelf CS-2", total_copies=8, available_copies=8, barcode_token="BAR-CS-002"),
            LibraryBookRecord(accession_no="ACC-003", isbn="978-8120340770", title="Indian Economy Since Independence", author="Uma Kapila", publisher="Academic Foundation", subject="Economics", department="Arts", shelf_rack="Shelf ECO-1", total_copies=6, available_copies=6, barcode_token="BAR-ARTS-001"),
            LibraryBookRecord(accession_no="ACC-004", isbn="978-0199458905", title="Principles of Financial Accounting", author="S.N. Maheshwari", publisher="Vikas Publishing", subject="Accounting", department="Commerce", shelf_rack="Shelf COM-1", total_copies=12, available_copies=12, barcode_token="BAR-COM-001"),
        ]
        db.add_all(books)
        db.commit()


def ensure_library_member(db: Session, user: User) -> LibraryMemberRecord:
    """Ensure user has a library membership record."""
    mem = db.query(LibraryMemberRecord).filter(LibraryMemberRecord.user_id == user.id).first()
    if not mem:
        m_type = MemberType.FACULTY if user.role == UserRole.teacher else (MemberType.STAFF if user.role == UserRole.admin else MemberType.STUDENT)
        limit = 5 if m_type != MemberType.STUDENT else 3
        mem = LibraryMemberRecord(
            user_id=user.id,
            member_code=f"LIB-MEM-{user.id:04d}",
            member_type=m_type,
            max_issue_limit=limit,
            current_borrowed=0,
            fine_balance=0.0
        )
        db.add(mem)
        db.commit()
    return mem


@router.get("/books")
def search_books(
    search: Optional[str] = None,
    department: Optional[str] = None,
    subject: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Search Book Catalog by Title, Author, ISBN, Subject, Department."""
    seed_default_library_catalog(db)
    q = db.query(LibraryBookRecord)

    if search:
        s_like = f"%{search}%"
        q = q.filter(
            LibraryBookRecord.title.ilike(s_like) |
            LibraryBookRecord.author.ilike(s_like) |
            LibraryBookRecord.accession_no.ilike(s_like) |
            LibraryBookRecord.isbn.ilike(s_like) |
            LibraryBookRecord.subject.ilike(s_like)
        )

    if department:
        q = q.filter(LibraryBookRecord.department.ilike(f"%{department}%"))
    if subject:
        q = q.filter(LibraryBookRecord.subject.ilike(f"%{subject}%"))

    total_count = q.count()
    results = q.order_by(LibraryBookRecord.id.asc()).offset(skip).limit(limit).all()

    return {
        "total_count": total_count,
        "books": [{
            "id": b.id,
            "accession_no": b.accession_no,
            "isbn": b.isbn,
            "title": b.title,
            "author": b.author,
            "publisher": b.publisher,
            "subject": b.subject,
            "department": b.department,
            "shelf_rack": b.shelf_rack,
            "total_copies": b.total_copies,
            "available_copies": b.available_copies,
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
            "barcode_token": b.barcode_token
        } for b in results]
    }


@router.post("/books")
def create_book(
    payload: Dict[str, Any],
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """Add new book catalog entry."""
    accession_no = payload.get("accession_no")
    title = payload.get("title")
    author = payload.get("author")
    copies = int(payload.get("copies", 5))

    existing = db.query(LibraryBookRecord).filter(LibraryBookRecord.accession_no == accession_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book accession number already exists")

    book = LibraryBookRecord(
        accession_no=accession_no,
        isbn=payload.get("isbn", ""),
        barcode_token=f"BAR-{accession_no}",
        title=title,
        author=author,
        publisher=payload.get("publisher", ""),
        subject=payload.get("subject", "General"),
        department=payload.get("department", "General"),
        shelf_rack=payload.get("shelf_rack", "Shelf A-1"),
        total_copies=copies,
        available_copies=copies,
        status=BookStatus.AVAILABLE,
        created_at=datetime.utcnow()
    )
    db.add(book)
    db.commit()

    return {"message": "Book cataloged successfully", "book_id": book.id}


@router.post("/issue")
def issue_book(
    payload: Dict[str, Any],
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 19: Issue Book to Library Member.
    Validates availability, issue limit, auto-calculates 14-day due date, and updates inventory.
    """
    book_id = payload.get("book_id")
    target_user_id = payload.get("user_id")

    book = db.query(LibraryBookRecord).filter(LibraryBookRecord.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book record not found")
    if book.available_copies <= 0:
        raise HTTPException(status_code=400, detail="Book currently unavailable for issue")

    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Member user record not found")

    member = ensure_library_member(db, user)

    if member.current_borrowed >= member.max_issue_limit:
        raise HTTPException(status_code=400, detail=f"Member issue limit ({member.max_issue_limit} books) reached")

    # Due date: 14 days for students, 30 days for faculty
    duration_days = 30 if member.member_type == MemberType.FACULTY else 14
    due_dt = date.today() + timedelta(days=duration_days)

    txn = LibraryIssueTransaction(
        book_id=book.id,
        member_id=member.id,
        issue_date=date.today(),
        due_date=due_dt,
        status=IssueStatus.ISSUED,
        created_at=datetime.utcnow()
    )
    db.add(txn)

    # Decrement available copies & increment member borrowed count
    book.available_copies -= 1
    if book.available_copies == 0:
        book.status = BookStatus.ISSUED

    member.current_borrowed += 1
    db.commit()

    return {
        "message": f"Book '{book.title}' issued to {user.full_name} successfully!",
        "transaction_id": txn.id,
        "due_date": due_dt.strftime("%d-%m-%Y")
    }


@router.post("/return/{transaction_id}")
def return_book(
    transaction_id: int,
    _=Depends(require_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Phase 19: Return Book Engine & Overdue Fine Calculation (₹5/day).
    Increments available copies, closes issue transaction, and records fine if overdue.
    """
    txn = db.query(LibraryIssueTransaction).filter(LibraryIssueTransaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Issue transaction not found")
    if txn.status == IssueStatus.RETURNED:
        return {"message": "Book already returned"}

    today = date.today()
    txn.return_date = today
    txn.status = IssueStatus.RETURNED

    late_days = (today - txn.due_date).days if today > txn.due_date else 0
    fine_amount = late_days * 5.0  # ₹5 per overdue day

    txn.late_days = max(0, late_days)
    txn.fine_amount = fine_amount

    # Update Member & Book inventory
    member = db.query(LibraryMemberRecord).filter(LibraryMemberRecord.id == txn.member_id).first()
    if member:
        member.current_borrowed = max(0, member.current_borrowed - 1)
        if fine_amount > 0:
            member.fine_balance += fine_amount

            fine_rec = LibraryFineRecord(
                transaction_id=txn.id,
                member_id=member.id,
                fine_type="OVERDUE",
                amount=fine_amount,
                status=FineStatus.PENDING,
                created_at=datetime.utcnow()
            )
            db.add(fine_rec)

    book = db.query(LibraryBookRecord).filter(LibraryBookRecord.id == txn.book_id).first()
    if book:
        book.available_copies += 1
        book.status = BookStatus.AVAILABLE

    db.commit()

    return {
        "message": "Book returned successfully",
        "late_days": txn.late_days,
        "fine_amount": fine_amount
    }


@router.get("/member/dashboard/{user_id}")
def get_member_library_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Member Library Dashboard (Active Borrowed Books, Due Dates, Fine Summary, Digital Card)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = db.query(User).first()

    member = ensure_library_member(db, user)
    txns = db.query(LibraryIssueTransaction, LibraryBookRecord)\
        .join(LibraryBookRecord, LibraryIssueTransaction.book_id == LibraryBookRecord.id)\
        .filter(LibraryIssueTransaction.member_id == member.id, LibraryIssueTransaction.status == IssueStatus.ISSUED)\
        .all()

    return {
        "member_info": {
            "member_code": member.member_code,
            "full_name": user.full_name,
            "member_type": member.member_type.value if hasattr(member.member_type, "value") else str(member.member_type),
            "max_issue_limit": member.max_issue_limit,
            "current_borrowed": member.current_borrowed,
            "fine_balance": member.fine_balance
        },
        "active_borrowed_books": [{
            "transaction_id": t.id,
            "book_id": b.id,
            "title": b.title,
            "author": b.author,
            "accession_no": b.accession_no,
            "issue_date": t.issue_date.strftime("%d-%m-%Y"),
            "due_date": t.due_date.strftime("%d-%m-%Y"),
            "is_overdue": date.today() > t.due_date
        } for t, b in txns]
    }


@router.get("/admin/dashboard")
def get_admin_library_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Admin Librarian Command Center Analytics."""
    seed_default_library_catalog(db)
    total_books = db.query(func.sum(LibraryBookRecord.total_copies)).scalar() or 0
    available_books = db.query(func.sum(LibraryBookRecord.available_copies)).scalar() or 0
    issued_books = db.query(LibraryIssueTransaction).filter(LibraryIssueTransaction.status == IssueStatus.ISSUED).count()
    overdue_books = db.query(LibraryIssueTransaction).filter(
        LibraryIssueTransaction.status == IssueStatus.ISSUED,
        LibraryIssueTransaction.due_date < date.today()
    ).count()

    total_fine_collected = db.query(func.sum(LibraryFineRecord.amount)).filter(LibraryFineRecord.status == FineStatus.PAID).scalar() or 0.0

    return {
        "total_books_copies": int(total_books),
        "available_copies": int(available_books),
        "currently_issued": issued_books,
        "overdue_count": overdue_books,
        "total_fine_collected": float(total_fine_collected)
    }


@router.get("/reports/{report_type}")
def get_library_reports(report_type: str, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    """Generate Official Book Register, Issue Register, Fine Register."""
    if report_type == "book-register":
        return search_books(_=None, db=db)
    elif report_type == "issue-register":
        txns = db.query(LibraryIssueTransaction, LibraryBookRecord, LibraryMemberRecord, User)\
            .join(LibraryBookRecord, LibraryIssueTransaction.book_id == LibraryBookRecord.id)\
            .join(LibraryMemberRecord, LibraryIssueTransaction.member_id == LibraryMemberRecord.id)\
            .join(User, LibraryMemberRecord.user_id == User.id)\
            .order_by(desc(LibraryIssueTransaction.id)).all()
        return {
            "report_title": "Official Library Book Issue & Return Register",
            "count": len(txns),
            "records": [{
                "txn_id": t.id,
                "accession_no": b.accession_no,
                "book_title": b.title,
                "member_name": u.full_name,
                "member_code": m.member_code,
                "issue_date": t.issue_date.strftime("%d-%m-%Y"),
                "due_date": t.due_date.strftime("%d-%m-%Y"),
                "return_date": t.return_date.strftime("%d-%m-%Y") if t.return_date else "-",
                "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                "fine_amount": t.fine_amount
            } for t, b, m, u in txns]
        }
    else:
        raise HTTPException(status_code=400, detail="Unsupported report type")
