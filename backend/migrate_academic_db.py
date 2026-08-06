from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_academic_schema():
    print("Creating all Academic Planner & Timetable tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Academic Planner & Timetable tables created successfully!")

if __name__ == "__main__":
    migrate_academic_schema()
