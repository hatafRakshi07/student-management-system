from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_exam_schema():
    print("Creating all examination tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All examination tables created successfully!")

if __name__ == "__main__":
    migrate_exam_schema()
