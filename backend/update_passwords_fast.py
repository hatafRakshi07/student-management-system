import sys, os
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.student import StudentProfile
from app.utils.password_handler import hash_password, verify_password

def process_student(student_id):
    db = SessionLocal()
    try:
        s = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if s and s.user:
            raw_phone = s.mobile or s.user.phone or s.father_mobile or "9876543210"
            phone = str(raw_phone).strip()
            s.user.phone = phone
            s.user.hashed_password = hash_password(phone)
            db.commit()
            return (s.roll_number, s.user.full_name, phone)
    except Exception as e:
        db.rollback()
        print(f"Error for student {student_id}: {e}")
    finally:
        db.close()
    return None

if __name__ == "__main__":
    db = SessionLocal()
    student_ids = [s.id for s in db.query(StudentProfile).all()]
    db.close()
    
    print(f"Updating passwords for {len(student_ids)} students using 16 threads...")
    results = []
    with ThreadPoolExecutor(max_workers=16) as executor:
        results = list(executor.map(process_student, student_ids))
    
    successful = [r for r in results if r is not None]
    print(f"Successfully updated {len(successful)} student passwords to their phone numbers!")
    
    # Test verification for a sample student
    db = SessionLocal()
    sample = db.query(StudentProfile).filter(StudentProfile.roll_number == "AC/BCA/24-25/1005").first()
    if sample and sample.user:
        match = verify_password(sample.user.phone, sample.user.hashed_password)
        print(f"Verification Check -> Scholar: {sample.roll_number} | Phone/Password: {sample.user.phone} | Match: {match}")
    db.close()
