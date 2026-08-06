from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_attendance_schema():
    print("Creating all attendance tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All attendance tables created successfully!")

if __name__ == "__main__":
    migrate_attendance_schema()
