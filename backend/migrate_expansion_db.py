from sqlalchemy import text
from app.database import engine, Base
import app.models

def migrate_expansion_schema():
    print("Creating all Phase 29-31 Expansion ERP tables on database...")
    Base.metadata.create_all(bind=engine)
    print("All Phase 29-31 Expansion ERP tables created successfully!")

if __name__ == "__main__":
    migrate_expansion_schema()
