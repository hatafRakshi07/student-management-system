from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_advanced_schema():
    print("Creating all Phase 32-34 Advanced ERP tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Phase 32-34 Advanced ERP tables created successfully!")

if __name__ == "__main__":
    migrate_advanced_schema()
