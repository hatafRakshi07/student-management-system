"""
Seed script to populate initial mock data in the database.
Usage: python -m app.seed
"""
import sys
from datetime import datetime, timedelta
from app.database import SessionLocal, create_tables
from app.models.user import User, UserRole
from app.models.student import StudentProfile
from app.models.teacher import TeacherProfile
from app.models.subject import Subject
from app.models.notice import Notice, TargetRole
from app.models.assignment import Assignment
from app.utils.password_handler import hash_password


def seed_database():
    create_tables()
    db = SessionLocal()
    try:
        print("Seeding database...")

        # 1. Admin User
        admin = db.query(User).filter(User.email == "admin@school.com").first()
        if not admin:
            admin = User(
                email="admin@school.com",
                full_name="System Admin",
                hashed_password=hash_password("admin123"),
                role=UserRole.admin,
                phone="9876543210",
                is_active=True,
            )
            db.add(admin)
            print("  Created Admin user: admin@school.com / admin123")

        # 2. Teacher User
        teacher = db.query(User).filter(User.email == "teacher@school.com").first()
        if not teacher:
            teacher = User(
                email="teacher@school.com",
                full_name="Dr. Sarah Connor",
                hashed_password=hash_password("teacher123"),
                role=UserRole.teacher,
                phone="9876543211",
                is_active=True,
            )
            db.add(teacher)
            db.flush()
            t_profile = TeacherProfile(
                user_id=teacher.id,
                employee_id="EMP-1001",
                department="Computer Science",
                qualification="Ph.D Computer Science",
                experience_years=8,
            )
            db.add(t_profile)
            print("  Created Teacher user: teacher@school.com / teacher123")

        # 3. Student User
        student = db.query(User).filter(User.email == "student@school.com").first()
        if not student:
            student = User(
                email="student@school.com",
                full_name="Alex Mercer",
                hashed_password=hash_password("student123"),
                role=UserRole.student,
                phone="9876543212",
                is_active=True,
            )
            db.add(student)
            db.flush()
            s_profile = StudentProfile(
                user_id=student.id,
                roll_number="CS-2024-001",
                department="Computer Science",
                class_name="B.Tech CS",
                section="A",
                semester=4,
                year=2,
                parent_email="parent@school.com",
                address="123 College Street",
            )
            db.add(s_profile)
            print("  Created Student user: student@school.com / student123")

        # 4. Parent User
        parent = db.query(User).filter(User.email == "parent@school.com").first()
        if not parent:
            parent = User(
                email="parent@school.com",
                full_name="John Mercer",
                hashed_password=hash_password("parent123"),
                role=UserRole.parent,
                phone="9876543213",
                is_active=True,
            )
            db.add(parent)
            print("  Created Parent user: parent@school.com / parent123")

        # 5. Subjects
        sub = db.query(Subject).filter(Subject.code == "CS401").first()
        if not sub:
            sub = Subject(
                name="Database Management Systems",
                code="CS401",
                class_name="B.Tech CS",
                section="A",
                semester=4,
                credits=4,
            )
            db.add(sub)

        # 6. Sample Notice
        notice = db.query(Notice).filter(Notice.title == "Welcome to Mid-Term Semester").first()
        if not notice:
            notice = Notice(
                title="Welcome to Mid-Term Semester",
                description="Mid-term examinations will commence from next month. Please check the timetable.",
                target_role=TargetRole.all,
                is_active=1,
                created_by_id=admin.id if admin else 1,
            )
            db.add(notice)

        db.commit()
        print("Seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
