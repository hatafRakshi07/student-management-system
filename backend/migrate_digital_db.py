from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_digital_schema():
    print("Creating all Phase 35-37 Digital Campus ERP tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Phase 35-37 Digital Campus ERP tables created successfully!")

if __name__ == "__main__":
    migrate_digital_schema()
