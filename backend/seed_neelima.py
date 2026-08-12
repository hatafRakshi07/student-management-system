import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.teacher import TeacherProfile, TeacherCourseAssignment
from app.utils.password_handler import hash_password

def seed_neelima():
    db = SessionLocal()
    try:
        # Check if Neelima Jain exists
        neelima_emails = ["neelima.jain@school.com", "neelimajain@school.com"]
        u = db.query(User).filter(User.email.in_(neelima_emails)).first()
        
        if not u:
            u = User(
                email="neelima.jain@school.com",
                full_name="Neelima Jain",
                hashed_password=hash_password("Teacher@123"),
                role=UserRole.teacher,
                phone="9829000001",
                is_active=True
            )
            db.add(u)
            db.flush()
            print("Created User: Neelima Jain (neelima.jain@school.com)")
        else:
            u.full_name = "Neelima Jain"
            u.hashed_password = hash_password("Teacher@123")
            u.is_active = True
            db.flush()

        tp = db.query(TeacherProfile).filter(TeacherProfile.user_id == u.id).first()
        if not tp:
            tp = TeacherProfile(
                user_id=u.id,
                employee_id="T004",
                department="Computer Applications",
                designation="Assistant Professor",
                qualification="MCA, M.Tech",
                experience_years=10
            )
            db.add(tp)
            db.flush()
        else:
            tp.department = "Computer Applications"
            tp.designation = "Assistant Professor"
            db.flush()

        # Add course assignments for BCA
        bca_courses = [
            ("BCA", "1st Year", "All", "Computer Fundamentals"),
            ("B.C.A.", "1st Year", "All", "C Programming"),
            ("B.C.A. I-SEM", "1st Year", "All", "Computer Fundamentals & Office Automation"),
            ("B.C.A. Part-I", "1st Year", "All", "Web Technologies"),
            ("B.C.A. Part-II", "2nd Year", "All", "Java Programming"),
            ("B.C.A. Part-III", "3rd Year", "All", "Software Engineering"),
        ]

        for course_name, yr, sec, subj in bca_courses:
            existing = db.query(TeacherCourseAssignment).filter(
                TeacherCourseAssignment.teacher_id == u.id,
                TeacherCourseAssignment.course_name == course_name,
                TeacherCourseAssignment.year == yr
            ).first()

            if not existing:
                assign = TeacherCourseAssignment(
                    teacher_id=u.id,
                    department="Computer Applications",
                    course_name=course_name,
                    year=yr,
                    section=sec,
                    subject_name=subj,
                    status="ACTIVE"
                )
                db.add(assign)

        # Also update Ms. Anita Singh and other teachers to have proper department
        anita = db.query(User).filter(User.email == "teacher3@school.com").first()
        if anita:
            tp_anita = db.query(TeacherProfile).filter(TeacherProfile.user_id == anita.id).first()
            if tp_anita:
                tp_anita.department = "Computer Applications"
                db.flush()

        db.commit()
        print("Successfully seeded Neelima Jain (neelima.jain@school.com / Teacher@123) with BCA assignments!")
    except Exception as e:
        db.rollback()
        print("Error seeding Neelima Jain:", e)
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_neelima()
