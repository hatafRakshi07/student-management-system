from app.database import SessionLocal
from app.models.fee import FeeTransaction
from app.models.student import StudentProfile
from app.models.user import User
from sqlalchemy import text

db = SessionLocal()

# Load all students and users into lookup maps
students = db.query(StudentProfile).all()
reg_to_userid = {}
name_to_userid = {}

for s in students:
    if s.user_id:
        if s.reg_no:
            reg_to_userid[s.reg_no.upper().strip()] = s.user_id
        if s.roll_number:
            reg_to_userid[s.roll_number.upper().strip()] = s.user_id
        if s.student_name:
            name_to_userid[s.student_name.upper().strip()] = s.user_id

users = db.query(User).all()
for u in users:
    if u.full_name:
        name_to_userid[u.full_name.upper().strip()] = u.id

txs = db.query(FeeTransaction).all()
linked_count = 0

for tx in txs:
    reg = tx.reg_no.upper().strip() if tx.reg_no else None
    name = tx.student_name.upper().strip() if tx.student_name else None
    
    target_user_id = None
    if reg and reg in reg_to_userid:
        target_user_id = reg_to_userid[reg]
    elif name and name in name_to_userid:
        target_user_id = name_to_userid[name]
    
    if target_user_id:
        tx.student_id = target_user_id
        linked_count += 1

db.commit()
print(f"Successfully linked {linked_count} fee transactions to student user accounts!")
print("Fee Transactions with student_id count now:", db.query(FeeTransaction).filter(FeeTransaction.student_id.isnot(None)).count())
db.close()
