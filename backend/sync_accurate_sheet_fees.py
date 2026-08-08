from app.database import SessionLocal
from app.models.fee import FeeTransaction, FeeSummary
from app.models.student import StudentProfile
from sqlalchemy import func

def sync_fast():
    db = SessionLocal()
    print("Connected to PostgreSQL database.")
    
    # Batch query all fee sums grouped by student_id
    sums = db.query(FeeTransaction.student_id, func.sum(FeeTransaction.paid_amount)).group_by(FeeTransaction.student_id).all()
    paid_map = {st_id: (s or 0.0) for st_id, s in sums if st_id}

    CLASS_FEES = {
        "B.A": 18000.0,
        "B.C.A": 28000.0,
        "B.COM": 16000.0,
        "B.SC": 22000.0,
        "M.A": 15000.0
    }

    students = db.query(StudentProfile).all()
    summaries = {fs.student_id: fs for fs in db.query(FeeSummary).all()}

    count = 0
    total_rev = 0.0

    for sp in students:
        paid = paid_map.get(sp.user_id, 0.0) or paid_map.get(sp.id, 0.0)
        cls = (sp.class_name or "").upper()
        tot = 20000.0
        for k, v in CLASS_FEES.items():
            if k in cls:
                tot = v
                break
        tot = max(tot, paid)
        pend = max(0.0, tot - paid)
        st = "PAID" if pend <= 0 else ("PARTIAL" if paid > 0 else "UNPAID")

        fs = summaries.get(sp.user_id)
        if not fs:
            fs = FeeSummary(student_id=sp.user_id, total_fee=tot, total_paid=paid, pending_fee=pend, current_status=st)
            db.add(fs)
        else:
            fs.total_fee = tot
            fs.total_paid = paid
            fs.pending_fee = pend
            fs.current_status = st

        count += 1
        total_rev += paid

    db.commit()
    print(f"SUCCESS! Fast synced accurate fee summaries for {count} real students.")
    print(f"Total Live Fee Collections Calculated: Rs. {total_rev:,.2f}")

    print("\nReal Sample Student Records from Database:")
    print("=" * 75)
    samples = db.query(StudentProfile, FeeSummary).join(FeeSummary, StudentProfile.user_id == FeeSummary.student_id).limit(5).all()
    for prof, sum_rec in samples:
        print(f"Name: {prof.student_name:<20} | Class: {prof.class_name:<18} | Fee: Rs. {sum_rec.total_fee:>8,.0f} | Paid: Rs. {sum_rec.total_paid:>8,.0f} | Pending: Rs. {sum_rec.pending_fee:>8,.0f} | Status: {sum_rec.current_status}")

    db.close()

if __name__ == "__main__":
    sync_fast()
