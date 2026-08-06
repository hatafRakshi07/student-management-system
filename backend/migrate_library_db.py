from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_library_schema():
    print("Creating all Library Management System tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Library Management System tables created successfully!")

if __name__ == "__main__":
    migrate_library_schema()
