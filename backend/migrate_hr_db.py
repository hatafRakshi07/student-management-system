from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_hr_schema():
    print("Creating all HR & Payroll tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All HR & Payroll tables created successfully!")

if __name__ == "__main__":
    migrate_hr_schema()
