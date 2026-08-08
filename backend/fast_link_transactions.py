from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# 1. Update student_id by reg_no or scholar_no matching StudentProfile
res1 = db.execute(text("""
    UPDATE fee_transactions ft
    SET student_id = sp.user_id
    FROM student_profiles sp
    WHERE ft.student_id IS NULL
      AND (
          UPPER(TRIM(ft.reg_no)) = UPPER(TRIM(sp.reg_no))
       OR UPPER(TRIM(ft.reg_no)) = UPPER(TRIM(sp.roll_number))
       OR UPPER(TRIM(ft.scholar_no)) = UPPER(TRIM(sp.roll_number))
       OR UPPER(TRIM(ft.scholar_no)) = UPPER(TRIM(sp.reg_no))
      )
"""))

# 2. Update remaining student_id by student_name matching User.full_name
res2 = db.execute(text("""
    UPDATE fee_transactions ft
    SET student_id = u.id
    FROM users u
    WHERE ft.student_id IS NULL
      AND u.role = 'student'
      AND UPPER(TRIM(ft.student_name)) = UPPER(TRIM(u.full_name))
"""))

db.commit()
print("Updated transactions by reg_no:", res1.rowcount)
print("Updated transactions by student_name:", res2.rowcount)
total_linked = db.execute(text("SELECT COUNT(id) FROM fee_transactions WHERE student_id IS NOT NULL")).scalar()
print("Total fee_transactions linked to student user accounts:", total_linked)
db.close()
